import { xfetch } from "@workspace/app-ui/lib/xfetch";

import type { AppLanguage } from "@workspace/i18n/core";

export interface AuthUserSummary {
  email: string;
  id: string;
  image?: string | null;
  name: string;
}

export interface AuthResultToken {
  token: string;
}

export type AuthFlowResult =
  | {
      resultToken: AuthResultToken;
      status: "signed_in";
      user: AuthUserSummary;
    }
  | {
      action: "link_provider" | "setup_password";
      code: string;
      email: string;
      message: string;
      status: "action_required";
    }
  | {
      code: string;
      message: string;
      status: "terminal_error";
    };

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface ApiSuccessResponse<T> {
  data: T;
  success: true;
}

interface AuthResultExchangeResponse {
  token: string;
  user: AuthUserSummary;
}

async function readApiError(response: Response): Promise<string> {
  const payload = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;
  return (
    payload?.message ||
    payload?.error ||
    `Request failed with status ${response.status}`
  );
}

async function readApiSuccess<T>(response: Response): Promise<T> {
  const payload = (await response
    .json()
    .catch(() => null)) as ApiSuccessResponse<T> | null;
  if (!payload?.success) {
    throw new Error("Server returned an unexpected response.");
  }

  return payload.data;
}

async function postAuthFlow(
  path: string,
  body: object,
  operation: string,
): Promise<AuthFlowResult> {
  const response = await xfetch(path, {
    body,
    method: "POST",
    operation,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return await readApiSuccess<AuthFlowResult>(response);
}

export async function continueDesktopEmailSignIn(params: {
  email: string;
  language?: AppLanguage;
  password: string;
}): Promise<AuthFlowResult> {
  return await postAuthFlow(
    "auth/app/email/sign-in",
    {
      email: params.email,
      language: params.language,
      password: params.password,
    },
    "Email sign-in",
  );
}

export async function continueDesktopEmailSignUp(params: {
  email: string;
  language?: AppLanguage;
  name: string;
  password: string;
  username?: string;
}): Promise<AuthFlowResult> {
  return await postAuthFlow(
    "auth/app/email/sign-up",
    {
      email: params.email,
      language: params.language,
      name: params.name,
      password: params.password,
      username: params.username,
    },
    "Email sign-up",
  );
}

export async function requestDesktopPasswordHelp(
  email: string,
  language?: AppLanguage,
): Promise<AuthFlowResult> {
  return await postAuthFlow(
    "auth/app/password/help",
    {
      email,
      language,
    },
    "Password help",
  );
}

export async function exchangeDesktopAuthResultToken(
  token: string,
): Promise<AuthResultExchangeResponse> {
  const response = await xfetch("auth/app/result/exchange", {
    body: { token },
    method: "POST",
    operation: "Auth result exchange",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return await readApiSuccess<AuthResultExchangeResponse>(response);
}
