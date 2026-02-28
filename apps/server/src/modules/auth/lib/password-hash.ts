import * as argon2 from "argon2";

const hashOption: argon2.Options = {
	memoryCost: 131072,
	timeCost: 4,
	hashLength: 64,
};

async function hashPassword(password: string): Promise<string> {
	const hash = await argon2.hash(password, {
		...hashOption,
	});

	return hash;
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
	const match = await argon2.verify(hash, password);

	return match;
}

export { hashPassword, verifyPassword };
