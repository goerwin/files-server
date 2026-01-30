import { getRequiredEnvVars, verifyPublicKey } from "./helpers";

const { SECRET_KEY } = getRequiredEnvVars(["SECRET_KEY"]);

const pbKey = process.argv[2];

if (!pbKey) {
	console.error("Missing param: <pbKey>");
	process.exit(1);
}

const username = verifyPublicKey(pbKey, SECRET_KEY);

if (!username) {
	console.error("Invalid key!");
	process.exit(1);
}

console.log(`Valid key for user: ${username}`);
