export type AuthChallengeAction = "link_provider" | "setup_password";

export type AuthActionRequiredCode = "link_provider_email_sent" | "setup_password_email_sent";

export type AuthTerminalErrorCode =
	| "account_already_linked_to_different_user"
	| "email_already_exists"
	| "email_delivery_unavailable"
	| "email_not_found"
	| "email_not_verified"
	| "invalid_email_or_password"
	| "invalid_token"
	| "invalid_or_expired_challenge"
	| "oauth_failed"
	| "provider_requires_manual_link"
	| "token_expired"
	| "user_not_found";

export interface AuthUserSummary {
	email: string;
	id: string;
	image?: string | null;
	name: string;
}

export interface AuthResultToken {
	token: string;
}

export interface AuthFlowSignedIn {
	resultToken: AuthResultToken;
	status: "signed_in";
	user: AuthUserSummary;
}

export interface AuthFlowActionRequired {
	action: AuthChallengeAction;
	code: AuthActionRequiredCode;
	email: string;
	message: string;
	status: "action_required";
}

export interface AuthFlowTerminalError {
	code: AuthTerminalErrorCode;
	message: string;
	status: "terminal_error";
}

export type AuthFlowResult = AuthFlowSignedIn | AuthFlowActionRequired | AuthFlowTerminalError;

export interface AuthResultExchangeResponse {
	token: string;
	user: AuthUserSummary;
}
