import { createAuthClient } from "better-auth/react";
import { emailOTPClient, usernameClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  baseURL: "http://localhost:7780",
  basePath: "auth",
  plugins: [usernameClient(), emailOTPClient()],
});

type ExtendedErrorCodes = typeof authClient.$ERROR_CODES & {
  VERIFICATION_EMAIL_ISNT_ENABLED: string;
};

type ErrorTypes = Partial<
  Record<
    keyof ExtendedErrorCodes,
    {
      en: string;
      th: string;
    }
  >
>;

const errorCodes = {
  INVALID_EMAIL_OR_PASSWORD: {
    en: "Invalid email or password",
    th: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  },
  INVALID_USERNAME_OR_PASSWORD: {
    en: "Invalid username or password",
    th: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง",
  },
  USER_ALREADY_EXISTS: {
    en: "User already registered",
    th: "ผู้ใช้งานนี้มีอยู่แล้ว",
  },
  VERIFICATION_EMAIL_ISNT_ENABLED: {
    en: "Verification email isn't enabled",
    th: "อีเมลยืนยันไม่สามารถใช้งานได้",
  },
  EMAIL_NOT_VERIFIED: {
    en: "Email verification is required",
    th: "โปรดยืนยันอีเมลก่อนเข้าใช้งาน",
  },
} satisfies ErrorTypes;

const getErrorMessage = (code: string, lang: "en" | "th" = "th") => {
  if (code in errorCodes) {
    return errorCodes[code as keyof typeof errorCodes][lang];
  }
  return "";
};

type Session = typeof authClient.$Infer.Session;

export { authClient, getErrorMessage, type Session };
