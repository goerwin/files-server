import crypto from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";

/**
 * Joins path segments and expands a leading `~` to the user's home directory.
 *
 * @param elementPaths - One or more path segments to join (e.g. `"~"`, `".config"`, `"app"`).
 * @returns The joined path with `~` replaced by `process.env.HOME` when set.
 * @throws {Error} If the path contains `~` but `HOME` is not set.
 */
export function parsePath(...elementPaths: string[]): string {
	const homeDir = process.env.HOME;
	const joinedPaths = path.join(...elementPaths);

	if (joinedPaths.includes("~") && !homeDir) {
		throw new Error("HomeDir not resolved");
	}

	if (!homeDir) return joinedPaths;

	return path.join(joinedPaths.replace("~", homeDir));
}

/**
 * Checks whether the given path exists and is a directory.
 *
 * @param dirPath - Absolute or relative path to check.
 * @returns `true` if the path is an existing directory, `false` otherwise (missing or not a directory).
 */
export async function dirExists(dirPath: string) {
	try {
		const s = await stat(dirPath);
		return s.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Reads required environment variables and exits the process if any are missing or empty.
 *
 * @param keys - List of environment variable names to require (e.g. `["PORT", "SECRET_KEY"]`).
 * @returns An object whose keys are the requested names and values are the env var strings.
 */
export function getRequiredEnvVars<const T extends readonly string[]>(keys: T) {
	const vars = {} as { [K in T[number]]: string };

	for (const key of keys as readonly T[number][]) {
		const value = process.env[key];

		if (value == null) {
			console.error("Missing required environment variable:", key);
			process.exit(1);
		}

		vars[key] = value;
	}

	return vars;
}

/**
 * Generates a public API key for a user: `userId` plus an HMAC-SHA256 signature in base64url.
 *
 * @param userId - The user identifier (e.g. username).
 * @param secret - Server-side secret used to sign the key.
 * @returns A string in the form `userId.<signature>`.
 */
export function generatePublicKey(userId: string, secret: string): string {
	const hmac = crypto
		.createHmac("sha256", secret)
		.update(userId)
		.digest("base64url");

	return `${userId}.${hmac}`;
}

/**
 * Verifies a public key produced by {@link generatePublicKey}.
 *
 * @param pbKey - The key to verify (format: `userId.<signature>`).
 * @param secret - The server-side secret used to verify the signature.
 * @returns The `userId` if the key is valid, or `null` if invalid or malformed.
 */
export function verifyPublicKey(pbKey: string, secret: string): string | null {
	const [userId, signature] = pbKey.split(".");

	if (!userId || !signature) return null;

	try {
		const expected = crypto
			.createHmac("sha256", secret)
			.update(userId)
			.digest("base64url");

		// constant-time compare
		const ok = crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expected),
		);

		return ok ? userId : null;
	} catch (err) {
		console.log(err);
		return null;
	}
}
