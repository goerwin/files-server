import { Hono } from "hono";
import {
	dirExists,
	getRequiredEnvVars,
	parsePath,
	verifyPublicKey,
} from "./helpers";

const { DATABASES_FOLDER_PATH, PORT, SECRET_KEY } = getRequiredEnvVars([
	"PORT",
	"SECRET_KEY",
	"DATABASES_FOLDER_PATH",
]);

if (!(await dirExists(parsePath(DATABASES_FOLDER_PATH)))) {
	console.error("Db path does not exist. Path:", DATABASES_FOLDER_PATH);
	process.exit(1);
}

const app = new Hono();

/**
 * Uploads the database file to the database folder path
 */
app.post("/db/:userId/:dbName", async function dbHandler(c) {
	const maxFileSize = 10 * 1024 * 1024; // 10 MB
	const { userId, dbName } = c.req.param();
	const dbFileName = `${userId}-${dbName}`.trim();
	const body = await c.req.parseBody();
	const file = body.file;

  console.log('authorization', c.req.header("authorization"));
	const pbKey = c.req.header("authorization")?.replace("PublicKey ", "");

	if (!pbKey) return c.json({ ok: false, error: "No public key" }, 401);

	const verifiedUserId = verifyPublicKey(pbKey, SECRET_KEY);

	if (verifiedUserId !== userId)
		return c.json({ ok: false, error: "Invalid public key" }, 401);

	if (!(file instanceof File))
		return c.json({ ok: false, error: "file is required" }, 400);

	if (file.size > maxFileSize) {
		const msg = `file too big. Max: ${maxFileSize} Bytes. Received: ${file.size}`;
		return c.json({ ok: false, error: msg }, 413);
	}

	await Bun.write(parsePath(DATABASES_FOLDER_PATH, dbFileName), file);

	return c.json({ ok: true, name: dbFileName });
});

//
// Starts the server
//
const server = Bun.serve({ port: PORT, fetch: app.fetch });

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
