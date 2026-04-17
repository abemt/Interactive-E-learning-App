const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";

function normalizeNeedsPasswordChange(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
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

export function setAuthSession({ token, user }) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem("token", token);
  }

  if (user) {
    const normalizedUser = {
      ...user,
      role: normalizeRole(user.role),
      needsPasswordChange: normalizeNeedsPasswordChange(user.needsPasswordChange)
    };
    const userSerialized = JSON.stringify(normalizedUser);
    localStorage.setItem(AUTH_USER_KEY, userSerialized);
    localStorage.setItem("user", userSerialized);
  }
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem("token");
}

export function getAuthUser() {
  const userRaw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem("user");
  const tokenPayload = decodeJwtPayload(getAuthToken());

  if (!userRaw) {
    if (!tokenPayload) {
      return null;
    }

    const rebuiltUser = {
      id: tokenPayload.sub ?? tokenPayload.id,
      email: tokenPayload.email,
      fullName: tokenPayload.fullName,
      role: normalizeRole(tokenPayload.role),
      classId: tokenPayload.classId ?? null,
      totalXP: tokenPayload.totalXP ?? 0,
      needsPasswordChange: normalizeNeedsPasswordChange(tokenPayload.needsPasswordChange)
    };

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(rebuiltUser));
    localStorage.setItem("user", JSON.stringify(rebuiltUser));
    return rebuiltUser;
  }

  try {
    const parsed = JSON.parse(userRaw);
    if (!parsed) return null;

    return {
      ...parsed,
      role: normalizeRole(parsed.role),
      needsPasswordChange: normalizeNeedsPasswordChange(parsed.needsPasswordChange)
    };
  } catch {
    // Fallback for stale/corrupt user payloads: rebuild a minimal user from JWT.
    if (!tokenPayload) {
      clearAuthSession();
      return null;
    }

    const rebuiltUser = {
      id: tokenPayload.sub ?? tokenPayload.id,
      email: tokenPayload.email,
      fullName: tokenPayload.fullName,
      role: normalizeRole(tokenPayload.role),
      classId: tokenPayload.classId ?? null,
      totalXP: tokenPayload.totalXP ?? 0,
      needsPasswordChange: normalizeNeedsPasswordChange(tokenPayload.needsPasswordChange)
    };

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(rebuiltUser));
    localStorage.setItem("user", JSON.stringify(rebuiltUser));
    return rebuiltUser;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);

  // Remove legacy keys to avoid stale auth state.
  localStorage.removeItem("token");
  localStorage.removeItem("user");
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
