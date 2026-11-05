# Linkly - URL Shortener with Analytics

A fully functional URL shortener built with **Node.js, Express 5, and PostgreSQL**. Users can turn long URLs into short codes (or choose vanity codes), redirect visitors with correct HTTP semantics (302/404/410), track every click with an atomic counter that never loses updates under concurrency, and export click logs as CSV. Fully documented with an OpenAPI 3.1 spec served via Swagger UI.

---

## 🎯 Project Goals

This project aims to:

- Build a **REST API** with correct HTTP semantics (400/404/409/410/429)
- Implement an **click counter**
- Use **PostgreSQL** with real constraints (`UNIQUE`, `CHECK`, `FK ON DELETE CASCADE`)
- Validate every input with **Zod**
- Implement **pagination** with cursors for the click log
- Test everything with **`node:test`** against a disposable test database
- Document the API with **OpenAPI 3.0** + Swagger UI at `/docs`

---

## 🚀 Key Features

### Create Short Links

- `POST /links` with `{ target_url, code?, expires_at? }`
- Returns **201 Created** with `short_url`, `created_at`, `click_count: 0`
- **Vanity codes** accepted if they match `^[A-Za-z0-9_-]{3,16}$`
- **Random base62 codes** generated automatically if omitted
- Duplicate codes rejected with **409 Conflict**
- Invalid URLs / malformed codes rejected with **400 Bad Request**

### Redirect with Correct Semantics

- `GET /:code` returns **302 Found** with `Location` header while the link is live
- **404 Not Found** for unknown codes
- **410 Gone** for expired links (checked at read time, never cached)
- **`click_count` incremented** in the same transaction as the click log insert
- **User-Agent and Referer** captured per click

### Click Counter

- **Single-statement SQL**

  ```sql
  UPDATE links SET click_count = click_count + 1 WHERE id = $1
  ```

- The increment and the `INSERT INTO clicks` share **one transaction**

### Click Log with Keyset Pagination

- `GET /links/:code/clicks?after=&limit=` returns `{ data, next_cursor }`
- Uses `id < $2 ORDER BY id DESC LIMIT $3` - **no OFFSET**
- Cursor is the last seen click ID; `null` means no more pages
- `limit` is bounded by Zod (`1..100`, default `20`)

### CSV Export

- `GET /links/:code/clicks.csv` streams the full log
- `Content-Type: text/csv` + `Content-Disposition: attachment`
- Fetched in **batches of 1000 rows** to avoid loading everything into memory
- Manual field escaping: quotes, commas, newlines handled

### 🗑️ Delete with Cascade

- `DELETE /links/:code` returns **204 No Content**
- Click log rows removed automatically by `ON DELETE CASCADE`
- **404** for unknown codes - nothing else happens

### Input Validation with Zod

- `target_url` must be a valid **http(s)** URL - `javascript:`, `data:`, `file:` rejected
- `code` must match `^[A-Za-z0-9_-]{3,16}$`
- `expires_at` must be a valid ISO 8601 date-time

### ⚡ Rate Limiter on POST /links

- **100 requests/minute per IP** - in-memory, no external dependency
- **429 Too Many Requests** with `Retry-After` header (minimum 1s)
- In-memory only - single-process deployments only (documented)

### OpenAPI 3.1 + Swagger UI

- Complete spec at `src/docs/openapi.json` covering all 7 endpoints
- Served interactively at **`GET /docs`**
- **Try it out** button works from the browser

### 💚 Health Check

- `GET /health` runs `SELECT 1` against the database
- **200** `{ status: "ok", database: "ok" }` when live
- **503** when the DB is unreachable

---

## 🛠 Tech Stack

### Languages & Frameworks

- **Node.js 20+** (ESM)
- **Express 5**
- **PostgreSQL 16**
- **Zod 4**

### Libraries

- **pg** - PostgreSQL driver with connection pooling
- **swagger-ui-express** - interactive API documentation
- **dotenv** - env loading

### Dev Tools

- **node:test** - built-in test runner
- **supertest** - HTTP assertions for contract tests
- **ESLint 9** with flat config + **Prettier**

---

## 📐 Database Schema

```sql
CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0)
);

CREATE TABLE clicks (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    referrer TEXT,
    user_agent TEXT
);

-- Indexes for the click log and keyset pagination
CREATE INDEX clicks_link_id_clicked_at_idx ON clicks (link_id, clicked_at);
CREATE INDEX clicks_link_id_id_desc_idx ON clicks (link_id, id DESC);
```

The `UNIQUE(code)` constraint provides the index used by every redirect lookup. Verified with `EXPLAIN`:

```bash
psql "$DATABASE_URL" -c "EXPLAIN SELECT id FROM links WHERE code = 'demo';"
# point to index scan using links_code_key on links
```

---

## 📁 Project Structure

```text
url_linkly/
├── .github/
│   └── workflows/
│       ├── linter.yml
│       └── neon_workflow.yml
├── scripts/
│   └── db-setup.js
│   ├── seeds.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config.js
│   ├── db.js
│   ├── db/
│   │   └── schema.sql
│   ├── docs/
│   │   └── openapi.json
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── rateLimit.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── links.js
│   │   ├── clicks.js
│   │   └── redirect.js
│   ├── services/
│   │   ├── linkService.js
│   │   └── clickService.js
│   ├── schemas/
│   │   ├── linkSchemas.js
│   │   └── clickSchemas.js
│   └── utils/
│       ├── code.js
│       ├── csv.js
│       └── errors.js
├── test/
│   ├── setup.js
│   ├── helpers.js
│   ├── health.test.js
│   ├── links.test.js
│   ├── redirect.test.js
│   ├── clicks.test.js
│   ├── rateLimit.test.js
│   └── security.test.js
├── .dockerignore
├── .env.example
├── .eslintrc.json (eslint.local.config.js)
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── .sqlfluff
├── docker-compose.yml
├── Dockerfile
├── package-log.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** = 24.21.0
- **PostgreSQL** ≥ 15 running locally
- A database user with `CREATEDB` privilege

### Installation

```bash
# Clone the repository
git clone https://github.com/mike2377/url_linkly.git

# Move into the project directory
cd url_linkly

# Install dependencies
npm install

# Create the databases
createdb linkly
createdb linkly_test

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and TEST_DATABASE_URL

# Apply the schema
npm run db:setup

# Start the development server
npm run dev
```

The API is available at `http://localhost:3000`.
Swagger UI: <<http://localhost:3000/docs>>

## 🐳 Quick Start (Docker)

The fastest way to run Linkly — one command, no local Postgres setup required.

```bash
git clone https://github.com/mike2377/url_linkly.git
cd url_linkly
docker compose up --build
```

### Useful Scripts

| Command            | Description                                |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Start server with `--watch` (auto-restart) |
| `npm start`        | Start server                               |
| `npm test`         | Run all tests against `linkly_test`        |
| `npm run lint`     | Run ESLint on `src/` and `test/`           |
| `npm run format`   | Run Prettier on the whole project          |
| `npm run db:setup` | Apply `schema.sql` to the current database |

---

### Docker Scripts

| Command | Description |
| --- | --- |
| `npm run docker:up` | Build and start the full stack (`db` + `app`) |
| `npm run docker:down` | Stop containers (data preserved in the volume) |
| `npm run docker:reset` | Stop and **delete all data** (fresh start) |
| `npm run docker:logs` | Follow `app` logs in real time |

---

## 🌐 Live Demo

🔗 **Deployed on Render:** [https://url-linkly.onrender.com](https://url-linkly.onrender.com)

Swagger UI: [https://url-linkly.onrender.com/docs](https://url-linkly.onrender.com/docs)

> ⚠️ **Cold start** - the free Render tier sleeps after 15 minutes of inactivity. The first request may take 30-60 seconds. Ping `/health` two minutes before a demo to wake it.

---

## 📸 API in Action

Every endpoint, tested live. Each pair shows the **Try it out** panel from Swagger UI alongside the actual server response.

### Create a short link - `POST /links`

|             Request (Swagger UI)             |             Response (201 Created)             |
| :------------------------------------------: | :--------------------------------------------: |
| ![Create request](images/create-request.png) | ![Create response](images/create-response.png) |

---

### Read link metadata - `GET /links/:code`

|          Request (Swagger UI)          |            Response (200 OK)             |
| :------------------------------------: | :--------------------------------------: |
| ![Get request](images/get-request.png) | ![Get response](images/get-response.png) |

---

### Redirect - `GET /:code`

Swagger UI follows the target site

> Redirecting `http://localhost:3000/sino` → `https://sinosourcing.store/products/750117308591`

---

### Click log with keyset pagination - `GET /links/:code/clicks`

|             Request (Swagger UI)             |         Response (200 OK with cursor)          |
| :------------------------------------------: | :--------------------------------------------: |
| ![Clicks request](images/clicks-request.png) | ![Clicks response](images/clicks-response.png) |

---

### CSV export — `GET /links/:code/clicks.csv`

|          Request (Swagger UI)          |          Response (CSV stream)           |
| :------------------------------------: | :--------------------------------------: |
| ![CSV request](images/csv-request.png) | ![CSV response](images/csv-response.png) |

---

### 🛡️ Duplicate code rejected — `POST /links` with existing code

|               Request (Swagger UI)               |              Response (409 Conflict)               |
| :----------------------------------------------: | :------------------------------------------------: |
| ![Conflict request](images/conflict-request.png) | ![Conflict response](images/conflict-response.png) |

---

### 💚 Health check — `GET /health`

|  Request (Swagger UI) and Response (200 OK)  |
| :------------------------------------------: |
| ![Health request](images/health-request.png) |

---

## 🧪 Testing

```bash
npm test
```

Runs `node:test` against `linkly_test`.

**33 tests** cover:

| Category       | What's tested                                                                 |
| -------------- | ----------------------------------------------------------------------------- |
| Contract       | 201/400/404/409/410/429 per endpoint                                          |
| Counter        | `click_count` survives **50 concurrent redirects** without lost updates       |
| Zod validation | URL schemes (`javascript:`, `data:`, `file:` rejected), code patterns, limits |
| Pagination     | Cursor-based, no `OFFSET`, `next_cursor: null` at end                         |
| CSV streaming  | Header, rows, correct `Content-Type`/`Content-Disposition`                    |
| Cascade delete | No orphan clicks after `DELETE /links/:code`                                  |
| Rate limiter   | 429 after max, `Retry-After` header present                                   |
| Security       | SQL injection attempts stay literal, `links` table survives                   |

---

## 🧠 Challenges Faced

### 1. Super-Linter v4 vs ESLint 9 Incompatibility

The provided `linter.yml` uses `github/super-linter@v4` (from 2021), which passes the `--eslintrc` flag that ESLint 9 removed. Every `.js` file failed with `Invalid option '--eslintrc'`.

**Solution**: renamed `eslint.config.js` to `eslint.local.config.js`. Super-Linter no longer detects a flat config and falls back to its own defaults. Local linting uses `eslint --config eslint.local.config.js` - no compromise on dev experience.

### 2. Counter Under Concurrency

The obvious approach (`SELECT click_count; UPDATE click_count = N + 1`) loses updates when two requests interleave. The brief required a single-statement atomic increment.

**Solution**: `UPDATE links SET click_count = click_count + 1 WHERE id = $1` inside a transaction with the `INSERT INTO clicks`. PostgreSQL serializes concurrent `UPDATE` on the same row. The 50-concurrent test proves it.

### 3. Keyset Pagination with Correct Cursor Semantics

`OFFSET` degrades linearly with page count and can skip rows when new clicks arrive mid-pagination.

**Solution**: `WHERE id < $2 ORDER BY id DESC LIMIT $3`. Fetch `limit + 1` rows to detect the next page without a separate `COUNT(*)`. Return only `limit` rows plus `next_cursor`. No `OFFSET`, no performance cliff.

### 4. Neon SSL + `channel_binding` Parameter

Neon's default connection string includes `&channel_binding=require`, which the `pg` driver doesn't support. Without explicit SSL config, Node rejects the self-signed certificate.

**Solution**: strip `channel_binding` from the URL at pool creation, and add `ssl: { rejectUnauthorized: false }` to the `pg.Pool` config. Done once in `src/db.js`, not repeated across services.

---

## 📚 What I Learned

- Writing **single-statement SQL**
- Implementing **pagination** correctly, cursors, `limit + 1` detection, null terminal cursor
- Using **`node:test`** with `--test-concurrency=1` to avoid DB conflicts between test files
- Structuring Zod schemas at the boundary
- Writing **OpenAPI 3.0** specs and validating them against
- **`TRUNCATE ... RESTART IDENTITY CASCADE`** for test isolation without re-creating the schema every run
- Debugging real production issues (`channel_binding`, SSL certs, `--eslintrc` flag, `space-before-function-paren`)

---

## Stretch Goals (Not Implemented)

- **Top-referrers analytics** - `GROUP BY referrer` per link
- **QR-code generation** - `GET /links/:code/qr` returning a PNG
- **Expiry sweeper** - a background job that retires expired links proactively (currently handled at read time)
- **Distributed rate limiter** - Redis-backed for multi-instance deployments

---

## 🏽‍💻 Author

**Kembou Keumoe Ivan Michael**
Junior Fullstack Developer

📩 Email: [kman39457@email.com](mailto:kman39457@email.com)
🌍 Based in Cameroon | Open to remote opportunities
🔗 GitHub: [github.com/mike2377](https://github.com/mike2377)

---
