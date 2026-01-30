# database-server

A small HTTP server that accepts **database file uploads** over POST, authenticated with a **public key** (HMAC-signed token). Uploaded files are stored under a configurable folder; keys are generated and verified using a shared server secret.

## Prerequisites

- [Bun](https://bun.sh) v1.x

## Setup

```bash
bun install
```

Create a `.env` file in the project root with:

| Variable                | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `PORT`                  | Server port (e.g. `3000`)                                                |
| `SECRET_KEY`            | Secret used to sign and verify public keys (keep private)                |
| `DATABASES_FOLDER_PATH` | Directory where uploaded DB files are stored (supports `~` for home dir) |

The server will not start if any of these are missing. The database folder path must already exist.

## Running the server

```bash
bun run start
```

With file watching during development:

```bash
bun run dev
```

## API

### `POST /db/:userId/:dbName`

Uploads a database file for the given `userId` and `dbName`.

- **Authentication:** `Authorization: PublicKey <key>` header. The key must be generated for the same `userId` as in the URL (see [Public keys](#public-keys)).
- **Body:** multipart form with a `file` field containing the database file.
- **Limits:** max file size 10 MB.
- **Storage:** file is saved under `DATABASES_FOLDER_PATH` as `{userId}-{dbName}`.

**Example**

```bash
curl -X POST "http://localhost:3000/db/alice/myapp.db" \
  -H "Authorization: PublicKey alice.<signature>" \
  -F "file=@/path/to/myapp.db"
```

## Public keys

Keys are **userId + HMAC-SHA256 signature** (base64url). They are not secret; they prove that the server issued the key for that user.

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
