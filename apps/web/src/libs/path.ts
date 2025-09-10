// allowed paths only
const ALLOWED_HOME_PATHS = new Set(["devices", "profile", "settings"]);

function getSafeHomeRedirect(path: string | undefined): string {
  if (!path || typeof path !== "string") return "/home";

  try {
    const url = new URL(path, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "home" && parts.length === 2) {
      const x = parts[1];
      if (ALLOWED_HOME_PATHS.has(x)) {
        return `/home/${x}`;
      }
    }

    return "/home";
  } catch {
    return "/home";
  }
}

export { getSafeHomeRedirect };
