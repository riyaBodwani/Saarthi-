"""Auth, notice isolation, assistant grounding, and reminder notification tests."""

from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

# Isolate DB before importing the app.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp.name).as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-32b"
os.environ.pop("GEMINI_API_KEY", None)

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings

get_settings.cache_clear()

from app.database.session import init_db
import main as main_module

init_db()
client = TestClient(main_module.app)


def _register_and_login(email: str, name: str = "Student") -> str:
    register = client.post(
        "/auth/register",
        json={"name": name, "email": email, "password": "password123"},
    )
    assert register.status_code == 201, register.text
    login = client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def test_register_login_me():
    token = _register_and_login("one@example.com", "One")
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "one@example.com"


def test_user_isolation_on_notices():
    token_a = _register_and_login("a@example.com", "A")
    token_b = _register_and_login("b@example.com", "B")

    created = client.post(
        "/notices",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "title": "A notice",
            "original_filename": "a.pdf",
            "extracted_text": "Submit by 30 November 2026",
            "analysis": {
                "summary": "Submit the form.",
                "important_dates": [
                    {
                        "label": "Deadline",
                        "date": "30 November 2026",
                        "type": "deadline",
                        "normalized_date": "2026-11-30",
                        "urgency": "upcoming",
                    }
                ],
                "action_items": ["Submit form"],
                "overall_urgency": "upcoming",
            },
        },
    )
    assert created.status_code == 201, created.text
    notice_id = created.json()["id"]

    forbidden = client.get(
        f"/notices/{notice_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden.status_code == 404

    owned = client.get(
        f"/notices/{notice_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert owned.status_code == 200
    assert owned.json()["title"] == "A notice"


def test_assistant_does_not_invent_missing_facts():
    token = _register_and_login("assist@example.com", "Assist")
    notice = client.post(
        "/notices",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Hostel notice",
            "extracted_text": "Hostel gates close at 10 PM.",
            "analysis": {"summary": "Hostel timing notice.", "action_items": []},
        },
    ).json()
    conversation = client.post(
        "/assistant/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"notice_id": notice["id"], "title": "Ask"},
    ).json()
    reply = client.post(
        f"/assistant/conversations/{conversation['id']}/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={"content": "What is the scholarship fee amount?", "language": "english"},
    )
    assert reply.status_code == 200, reply.text
    content = reply.json()["message"]["content"].lower()
    assert "could not find" in content or "does not contain" in content or "cannot invent" in content


def test_reminder_process_due_creates_notification():
    token = _register_and_login("remind@example.com", "Remind")
    past = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    created = client.post(
        "/reminders",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Form reminder", "scheduled_at": past},
    )
    assert created.status_code == 201, created.text
    processed = client.post(
        "/reminders/process-due",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert processed.status_code == 200
    assert processed.json()["processed"] >= 1
    notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notifications.status_code == 200
    assert any(item["kind"] == "reminder" for item in notifications.json())


def test_health_still_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


if __name__ == "__main__":
    test_register_login_me()
    test_user_isolation_on_notices()
    test_assistant_does_not_invent_missing_facts()
    test_reminder_process_due_creates_notification()
    test_health_still_ok()
    print("test_app_auth_notices.py: all passed")
