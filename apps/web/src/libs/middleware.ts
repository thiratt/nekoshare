import { authClient } from "./auth";

async function authMiddleWare() {
  const session = await authClient.getSession();

  return session.data !== null;
}

export { authMiddleWare };
