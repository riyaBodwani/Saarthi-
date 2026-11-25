import { apiRequest } from "./apiClient";

export function createConversation(token, { noticeId = null, title = null } = {}) {
  return apiRequest("/assistant/conversations", {
    method: "POST",
    token,
    body: { notice_id: noticeId, title },
  });
}

export function listConversations(token) {
  return apiRequest("/assistant/conversations", { token });
}

export function getConversation(token, conversationId) {
  return apiRequest(`/assistant/conversations/${conversationId}`, { token });
}

export function sendAssistantMessage(
  token,
  conversationId,
  { content, language = "english" }
) {
  return apiRequest(`/assistant/conversations/${conversationId}/messages`, {
    method: "POST",
    token,
    body: { content, language },
  });
}

export function clearConversation(token, conversationId) {
  return apiRequest(`/assistant/conversations/${conversationId}/clear`, {
    method: "POST",
    token,
  });
}
