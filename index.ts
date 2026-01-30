import { type Context, Hono } from "hono";
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

// Uploads the files to the users' [username] folder in the files folder
app.post("/files/:username", filesHandler);

// Uploads the files to the users' [username/folder] folder in the files folder
app.post("/files/:username/:folder", filesHandler);

/**
 * Handles file uploads for authenticated users.
 * Accepts between 1 and 10 files per request, up to 10 MB per file.
 */
async function filesHandler(c: Context) {
	const maxFileSize = 10 * 1024 * 1024; // 10 MB
	const { username, folder = "" } = c.req.param();

	const pbKey = c.req.header("authorization")?.replace("PublicKey ", "");
	if (!pbKey) return c.json({ ok: false, error: "No public key" }, 401);

	const verifiedUserId = verifyPublicKey(pbKey, SECRET_KEY);
	if (verifiedUserId !== username) return c.json({ ok: false, error: "Invalid public key" }, 401);

	const reqFiles = (await c.req.formData()).getAll("files");
	const files = reqFiles.filter((f) => f instanceof File);

	if (files.length === 0 || files.length > 10) {
		return c.json({ ok: false, error: "Between 1 and 10 files are required" }, 400);
	}

	if (files.some((file) => file.size > maxFileSize)) {
		return c.json({ ok: false, error: `A file is too large. Max: ${maxFileSize} Bytes.` }, 413);
	}

	const results: { path: string; name: string }[] = [];
	for (const file of files) {
		const relativeFilePath = parsePath(username, folder, file.name);
		await Bun.write(parsePath(FILES_FOLDER_PATH, relativeFilePath), file);
		results.push({ path: relativeFilePath, name: file.name });
	}

	return c.json({ ok: true, files: results });
}

//
// Starts the server
//
const server = Bun.serve({ port: PORT, fetch: app.fetch });

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
