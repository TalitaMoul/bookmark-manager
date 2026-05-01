# Bookmark Manager API

A REST API for managing web bookmarks built with Node.js, Express, and TypeScript. Users can save URLs, tag them, and retrieve them later with optional filtering.

## Tech Stack

- **Node.js + Express** — HTTP server and routing
- **TypeScript** — static typing throughout
- **Zod** — input validation and schema definition
- **Jest + Supertest** — automated testing
- **JSON file** — local data persistence (no database server required)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `BOOKMARKS_FILE` | `./bookmarks.json` | Path to the JSON storage file |

### Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

### Testing

```bash
npm test
```

Tests run against an isolated file (`bookmarks.test.json`) and never touch the production data file.

## API Reference

### Health Check

```
GET /health
```

**Response**
```json
{ "status": "ok" }
```

---

### List Bookmarks

```
GET /bookmarks
GET /bookmarks?tag=music
```

Use the optional `tag` query parameter to filter results. Matching is case-insensitive.

**Response** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "Ghost Official Site",
    "url": "https://www.ghost-official.com",
    "description": "Official Ghost band website",
    "tags": ["music", "rock"]
  }
]
```

---

### Get Bookmark by ID

```
GET /bookmarks/:id
```

**Response** `200 OK`
```json
{
  "id": "a1b2c3d4-...",
  "title": "Ghost Official Site",
  "url": "https://www.ghost-official.com",
  "tags": ["music"]
}
```

**Error** `404 Not Found`
```json
{ "error": "Bookmark not found" }
```

---

### Create Bookmark

```
POST /bookmarks
Content-Type: application/json
```

**Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ | Non-empty title |
| `url` | string | ✅ | Valid URL |
| `description` | string | ❌ | Optional description |
| `tags` | string[] | ❌ | List of tags (defaults to `[]`) |

**Example**
```json
{
  "title": "Ghost Official Site",
  "url": "https://www.ghost-official.com",
  "tags": ["music", "rock"]
}
```

**Response** `201 Created`
```json
{
  "id": "a1b2c3d4-...",
  "title": "Ghost Official Site",
  "url": "https://www.ghost-official.com",
  "tags": ["music", "rock"]
}
```

**Error** `400 Bad Request`
```json
{
  "errors": [
    { "message": "Must be a valid URL", "path": ["url"] }
  ]
}
```

---

### Update Bookmark

```
PUT /bookmarks/:id
Content-Type: application/json
```

Replaces all fields of an existing bookmark. Accepts the same body as `POST /bookmarks`.

**Response** `200 OK` — returns the updated bookmark

**Errors**
- `400 Bad Request` — invalid body
- `404 Not Found` — bookmark does not exist

---

### Delete Bookmark

```
DELETE /bookmarks/:id
```

**Response** `204 No Content`

**Error** `404 Not Found`
```json
{ "error": "Bookmark not found" }
```

## Project Structure

```
bookmark-manager/
├── src/
│   ├── index.ts       # Express app and route handlers
│   ├── types.ts       # Zod schema and TypeScript types
│   ├── storage.ts     # JSON file persistence
│   └── config.ts      # Environment variable validation
├── .env.example       # Available environment variables
├── jest.config.cjs    # Jest configuration
├── tsconfig.json
└── package.json
```
