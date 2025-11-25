export type TLoginSchema = {
	identifier: string;
	password: string;
};

export type TSignupSchema = {
	username: string;
	email: string;
	password: string;
};

export type TResetPasswordSchema = {
	email: string;
};
