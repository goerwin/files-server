import { Hono, type Context } from "hono";
import { dirExists, getRequiredEnvVars, parsePath, verifyPublicKey } from "./helpers";

const { FILES_FOLDER_PATH, PORT, SECRET_KEY } = getRequiredEnvVars([
	"PORT",
	"SECRET_KEY",
	"FILES_FOLDER_PATH",
]);

if (!(await dirExists(parsePath(FILES_FOLDER_PATH)))) {
	console.error("Files path does not exist. Path:", FILES_FOLDER_PATH);
	process.exit(1);
}

const app = new Hono();

// Uploads the files to the users folder in the files folder
app.post("/files/:username", filesHandler);

// Uploads the files to the users' project folder in the files folder
app.post("/files/:username/:project", filesHandler);

async function filesHandler(c: Context) {
	const maxFileSize = 10 * 1024 * 1024; // 10 MB
	const { username, project = "" } = c.req.param();
	const body = await c.req.parseBody();
	const file = body.file;

	const pbKey = c.req.header("authorization")?.replace("PublicKey ", "");
	if (!pbKey) return c.json({ ok: false, error: "No public key" }, 401);

	const verifiedUserId = verifyPublicKey(pbKey, SECRET_KEY);
	if (verifiedUserId !== username) return c.json({ ok: false, error: "Invalid public key" }, 401);
	if (!(file instanceof File)) return c.json({ ok: false, error: "file is required" }, 400);

	if (file.size > maxFileSize) {
		const msg = `file too big. Max: ${maxFileSize} Bytes. Received: ${file.size}`;
		return c.json({ ok: false, error: msg }, 413);
	}

	const fileName = body.name && typeof body.name === "string" ? body.name : file.name;
	const relativeFilePath = parsePath(username, project, fileName);
	await Bun.write(parsePath(FILES_FOLDER_PATH, relativeFilePath), file);
	return c.json({ ok: true, path: relativeFilePath });
}

//
// Starts the server
//
const server = Bun.serve({ port: PORT, fetch: app.fetch });

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
