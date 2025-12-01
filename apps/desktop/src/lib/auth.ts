import { createAuthClient } from "better-auth/react";
// import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:7780",
  basePath: "/auth",
});

// export const {
//   useSession,
//   signIn,
//   signUp,
//   signOut,
//   forgetPassword,
//   resetPassword,
// } = authClient;

// export type Session = typeof authClient.$Infer.Session;
// export type User = typeof authClient.$Infer.Session.user;
