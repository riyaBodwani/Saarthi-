import { apiRequest } from "./apiClient";

export function fetchCalendarEvents(token, params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query}` : "";
  return apiRequest(`/calendar/events${suffix}`, { token });
}

export function fetchActionItems(token, params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query}` : "";
  return apiRequest(`/action-items${suffix}`, { token });
}

export function updateActionItem(token, itemId, patch) {
  return apiRequest(`/action-items/${itemId}`, {
    method: "PATCH",
    token,
    body: patch,
  });
}

export function fetchReminders(token) {
  return apiRequest("/reminders", { token });
}

export function createReminder(token, payload) {
  return apiRequest("/reminders", { method: "POST", token, body: payload });
}

export function updateReminder(token, reminderId, patch) {
  return apiRequest(`/reminders/${reminderId}`, {
    method: "PATCH",
    token,
    body: patch,
  });
}

export function deleteReminder(token, reminderId) {
  return apiRequest(`/reminders/${reminderId}`, { method: "DELETE", token });
}

export function fetchNotifications(token) {
  return apiRequest("/notifications", { token });
}

export function markNotificationRead(token, notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "POST",
    token,
  });
}

export function markAllNotificationsRead(token) {
  return apiRequest("/notifications/read-all", { method: "POST", token });
}
