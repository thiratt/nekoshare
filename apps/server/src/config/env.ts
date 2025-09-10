function requireEnvVar(name: string): string {
	const value = process.env[name];
	if (value === undefined || value.trim() === "") {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

const env = {
	PORT: Number(process.env.PORT) || 7780,

	MAIL_SERVER_KEY: requireEnvVar("MAIL_SERVER_KEY"),

	DB_HOST: requireEnvVar("DB_HOST"),
	DB_USER: requireEnvVar("DB_USER"),
	DB_PASSWORD: requireEnvVar("DB_PASSWORD"),
	DB_NAME: requireEnvVar("DB_NAME"),
	DB_PORT: Number(requireEnvVar("DB_PORT")),

	GOOGLE_CLIENT_ID: requireEnvVar("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: requireEnvVar("GOOGLE_CLIENT_SECRET"),
};

export { env };
