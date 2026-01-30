import { config } from "dotenv";

// Load .env from cwd if present (optional; Bun also auto-loads when run via bun)
config();

const REQUIRED_ENV_KEYS = ["PORT", "SECRET_KEY"];

function requireEnv(keys: string[]): void {
	const missing = keys.filter((key) => {
		const value = process.env[key];
		return value === undefined || value === "";
	});

	if (missing.length > 0) {
		console.error("Missing required environment variables:");
		for (const key of missing) console.error(`  - ${key}`);
		process.exit(1);
	}
}

requireEnv(REQUIRED_ENV_KEYS);

const port = Number(process.env.PORT);
Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/hello" && req.method === "GET") {
			return new Response("hello there!", {
				headers: { "Content-Type": "text/plain" },
			});
		}

		const dbMatch = /^\/db\/([^/]+)\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
		if (dbMatch && req.method === "POST") {
			const [, user, project, name] = dbMatch;
      console.log(user, project, name);
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Server running at http://localhost:${port}`);
