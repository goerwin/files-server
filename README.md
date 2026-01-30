# files-server

A small HTTP server that accepts **file uploads** over POST, authenticated with a **public key** (HMAC-signed token). Uploaded files are stored under a configurable folder; keys are generated and verified using a server secret.

## Prerequisites

- [Bun](https://bun.sh) v1.x

## Setup

```bash
bun install
```

Create a `.env` file in the project root with:

| Variable            | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `PORT`              | Server port (e.g. `3000`)                                             |
| `SECRET_KEY`        | Secret used to sign and verify public keys (keep private)             |
| `FILES_FOLDER_PATH` | Directory where uploaded files are stored (supports `~` for home dir) |

The server will not start if any of these environment variables are not available at runtime.
The files folder path must already exist.

## Running the server

```bash
bun run start

# Or with file watching during development:
bun run dev
```

## API

### `GET /`

Simple health/status check.

- **Response:** `{ "ok": true, "status": "ok" }`

### `GET /verify-public-key/:pbKey`

Verifies a public key and returns whether it is valid and which username it belongs to.

- **Params:** `pbKey` – the public key string (`username.<signature>`).
- **Response:** `{ "verified": boolean, "username": string | null }`

### `POST /files/:username`

Uploads one or more files for `username` into that user’s folder.

### `POST /files/:username/:folder`

Uploads one or more files for `username` into the user’s `folder` subfolder.

- **Authentication:** `Authorization: PublicKey <key>` header. The key must be generated for the same `username` as in the URL (see [Public keys](#public-keys)).
- **Body:** multipart form with one or more `files` fields.
- **Limits:** 1–10 files per request, max file size 10 MB per file.
- **Storage:** files are saved under `FILES_FOLDER_PATH` as `{username}/{folder?}/{filename}`.

**Example**

```bash
curl -X POST "http://localhost:3000/files/alice/myfolder" \
  -H "Authorization: PublicKey alice.<signature>" \
  -F "files=@/path/to/file1.txt" \
  -F "files=@/path/to/file2.txt"
```

## Public keys

Keys are **username + HMAC-SHA256 signature** (base64url). They are not secret; they prove that the server issued the key for that username.

### Generate a key (CLI)

Requires `SECRET_KEY` in `.env`. Pass the username as the first argument:

```bash
bun run generate-pbkey alice
```

Output: `Key for alice: alice.<signature>`

### Verify a key (CLI)

```bash
bun run verify-pbkey "alice.<signature>"
```

Exits with the associated user id on success, or an error if the key is invalid.
