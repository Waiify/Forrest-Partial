const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = API_ROOT.endsWith("/api") ? API_ROOT : `${API_ROOT}/api`;

export async function recordLogout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);
  const token = sessionStorage.getItem("token");

  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Logout activity was not recorded (${response.status}).`);
    }
  } catch (error) {
    console.error("Could not record logout activity:", error);
  } finally {
    window.clearTimeout(timeout);
    sessionStorage.removeItem("settingsUnlockToken");
  }
}
