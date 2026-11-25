import { apiRequest } from "./apiClient";

export function registerUser({ name, email, password }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
}

export function loginUser({ email, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchCurrentUser(token) {
  return apiRequest("/auth/me", { token });
}

export function logoutUser(token) {
  return apiRequest("/auth/logout", { method: "POST", token });
}
