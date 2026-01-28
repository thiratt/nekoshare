function generateConnectionId(protocol: "ws" | "tcp"): string {
	const shortUUID = crypto.randomUUID().split("-")[0];
	const now = Date.now();
	return `${protocol}_${now}_${shortUUID}`;
}

export { generateConnectionId };
