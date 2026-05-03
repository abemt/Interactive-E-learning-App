const AUTH_USER_KEY = "authUser";
const LEGACY_AUTH_USER_KEY = "user";
const LEGACY_AUTH_TOKEN_KEYS = ["authToken", "token"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function normalizeNeedsPasswordChange(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeRole(role) {
  if (!role || typeof role !== "string") return role;

  const trimmed = role.trim();
  const mapped = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent"
  };

  return mapped[trimmed.toLowerCase()] || trimmed;
}

function normalizeStoredUser(user) {
  if (!user) return null;

  return {
    ...user,
    role: normalizeRole(user.role),
    needsPasswordChange: normalizeNeedsPasswordChange(user.needsPasswordChange)
  };
}

function persistAuthUser(user) {
  const normalizedUser = normalizeStoredUser(user);

  if (!normalizedUser) {
    return null;
  }

  const userSerialized = JSON.stringify(normalizedUser);
  localStorage.setItem(AUTH_USER_KEY, userSerialized);
  localStorage.setItem(LEGACY_AUTH_USER_KEY, userSerialized);

  return normalizedUser;
}

function clearStoredAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  LEGACY_AUTH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
}

function parseStoredUser(userRaw) {
  if (!userRaw) {
    return null;
  }

  try {
    return normalizeStoredUser(JSON.parse(userRaw));
  } catch {
    return null;
  }
}

export function setAuthSession({ user } = {}) {
  if (!user) {
    return null;
  }

  return persistAuthUser(user);
}

export function getAuthUser() {
  const userRaw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(LEGACY_AUTH_USER_KEY);

  if (!userRaw) {
    return null;
  }

  const parsed = parseStoredUser(userRaw);
  if (parsed) {
    return parsed;
  }

  clearStoredAuthUser();
  return null;
}

export function clearAuthSession() {
  clearStoredAuthUser();

  void fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  }).catch(() => {});
}

export async function refreshAuthSession() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    clearStoredAuthUser();
    const error = new Error(payload?.message || "Session expired.");
    error.status = response.status;
    throw error;
  }

  const user = payload?.user || payload?.data?.user || payload?.data || null;

  if (!user) {
    clearStoredAuthUser();
    throw new Error("Session response did not include a user.");
  }

  persistAuthUser(user);
  return getAuthUser();
}

export function getDashboardRouteByRole(role) {
  switch (normalizeRole(role)) {
    case "Student":
      return "/student/dashboard";
    case "Teacher":
      return "/teacher/dashboard";
    case "Parent":
      return "/parent/dashboard";
    case "Admin":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}
