export type LoginSuccessResult = {
	ok: true;
	user: {
		id: string;
		name: string | null | undefined;
	};
};

export type LoginFailureResult = {
	ok: false;
	message: string;
	shouldShutdown: boolean;
};

export type LoginResult = LoginSuccessResult | LoginFailureResult;

export type TokenRevokeResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			message: string;
	  };
