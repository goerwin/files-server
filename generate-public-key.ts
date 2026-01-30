import { generatePublicKey, getRequiredEnvVars } from "./helpers";

const { SECRET_KEY } = getRequiredEnvVars(["SECRET_KEY"]);

const username = process.argv[2];

if (!username) {
	console.error("Missing param: <username>");
	process.exit(1);
}

console.log(`Key for ${username}: ${generatePublicKey(username, SECRET_KEY)}`);
