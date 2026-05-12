# 🎬 i99flix API

REST API for the i99flix movie streaming platform. Built with **Fastify**, **MongoDB**, and **TypeScript**.

---

## Tech Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Runtime    | Node.js + TypeScript         |
| Framework  | Fastify 5                    |
| Database   | MongoDB via Mongoose         |
| Auth       | JWT + httpOnly cookies       |
| Validation | TypeBox (OpenAPI-compatible) |
| Docs       | Swagger UI                   |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp example.env .env
```

Then edit `.env` with your values:

```env
PORT=4321
MONGODB_URI=mongodb://localhost:27017/moviedb
JWT_SECRET=your_strong_random_secret_here
COOKIE_SECRET=another_strong_random_secret
CLIENT_ORIGIN=http://localhost:1234
```

> **Security** — `JWT_SECRET` and `COOKIE_SECRET` must each be at least 16 characters. Use a random generator in production.

### 3. Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:4321`.

---

## API Reference

All endpoints are prefixed with `/api/v1`.

Interactive docs are available at **`http://localhost:4321/docs`** once the server is running.

---

### System

#### `GET /api/v1/health`

Check the health of the API and its dependencies. No authentication required.

**Response `200` — healthy**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 142,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "db": {
    "status": "connected"
  }
}
```

**Response `503` — degraded** (API is up but DB is unreachable)

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "uptime": 5,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "db": {
    "status": "disconnected"
  }
}
```

> Useful for load balancers, Docker `HEALTHCHECK`, Kubernetes probes, and uptime monitors.

---

### Authentication

Session is managed via a secure **httpOnly cookie** — no tokens in JavaScript.

#### `POST /api/v1/signup`

Create a new account.

**Body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```

| Field      | Rules                          |
| ---------- | ------------------------------ |
| `name`     | 2–100 characters               |
| `email`    | Valid email, 10–100 characters |
| `password` | Minimum 7 characters           |

**Responses**

| Status | Meaning              |
| ------ | -------------------- |
| `201`  | Account created      |
| `409`  | Email already taken  |
| `422`  | Invalid email format |

---

#### `POST /api/v1/signin`

Sign in and receive a session cookie.

**Body**

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

> Rate limited to **3 attempts per minute** to prevent brute force.

**Responses**

| Status | Meaning                        |
| ------ | ------------------------------ |
| `200`  | Signed in — session cookie set |
| `401`  | Invalid credentials            |

---

#### `GET /api/v1/me`

Check if the current session is valid. Requires the session cookie.

**Responses**

| Status | Meaning                   |
| ------ | ------------------------- |
| `200`  | `true` — session is valid |
| `401`  | Not authenticated         |

---

#### `POST /api/v1/signout`

Clear the session cookie.

**Responses**

| Status | Meaning    |
| ------ | ---------- |
| `200`  | Signed out |

---

### Movies

#### `GET /api/v1/movies`

List movies with optional filters and pagination.

**Query parameters**

| Param        | Type    | Description                                             |
| ------------ | ------- | ------------------------------------------------------- |
| `page`       | number  | Page number (default: `1`)                              |
| `limit`      | number  | Items per page, max `100` (default: `20`)               |
| `search`     | string  | Full-text search on title and description               |
| `genre`      | string  | Filter by genre (e.g. `Action`)                         |
| `year`       | number  | Filter by release year                                  |
| `featured`   | boolean | Only featured movies                                    |
| `trending`   | boolean | Only trending movies                                    |
| `newRelease` | boolean | Only new releases                                       |
| `sortBy`     | string  | `title` · `rating` · `year` · `createdAt` · `updatedAt` |
| `order`      | string  | `asc` or `desc` (default: `desc`)                       |

**Example**

```
GET /api/v1/movies?genre=Action&sortBy=rating&order=desc&limit=10
```

**Response `200`**

```json
{
  "data": [ { "_id": "...", "title": "...", "genre": ["Action"], ... } ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

#### `GET /api/v1/movies/:id`

Get a single movie by its MongoDB ID.

**Response `200`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "title": "Inception",
  "description": "A thief who steals corporate secrets...",
  "genre": ["Action", "Sci-Fi"],
  "rating": 8.8,
  "year": 2010,
  "duration": "2h 28m",
  "thumbnail": "https://...",
  "backdrop": "https://...",
  "featured": true,
  "trending": false,
  "newRelease": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

| Status | Meaning         |
| ------ | --------------- |
| `200`  | Movie found     |
| `404`  | Movie not found |

---

#### `POST /api/v1/movies` 🔒

Create a new movie. **Requires authentication.**

**Body**

```json
{
  "title": "Inception",
  "description": "A thief who steals corporate secrets through dream-sharing technology.",
  "genre": ["Action", "Sci-Fi"],
  "rating": 8.8,
  "year": 2010,
  "duration": "2h 28m",
  "thumbnail": "https://...",
  "backdrop": "https://...",
  "featured": true,
  "trending": false,
  "newRelease": false
}
```

| Status | Meaning           |
| ------ | ----------------- |
| `201`  | Movie created     |
| `400`  | Validation error  |
| `401`  | Not authenticated |

---

#### `PUT /api/v1/movies/:id` 🔒

Replace an existing movie. **Requires authentication.**

Same body shape as `POST`. Returns the updated movie on `200`.

| Status | Meaning           |
| ------ | ----------------- |
| `200`  | Movie updated     |
| `400`  | Validation error  |
| `401`  | Not authenticated |
| `404`  | Movie not found   |

---

#### `DELETE /api/v1/movies/:id` 🔒

Delete a movie. **Requires authentication.**

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| `200`  | `{ "message": "Movie deleted successfully" }` |
| `401`  | Not authenticated                             |
| `404`  | Movie not found                               |

---

## Project Structure

```
src/
├── app.ts                  # Fastify app factory — registers all plugins
├── server.ts               # Entry point — starts the server
├── config/
│   ├── app-env.ts          # Environment variable validation (@fastify/env)
│   ├── app-routes.ts       # Route path constants
│   └── db.ts               # MongoDB connection
├── constants/
│   ├── auth.constant.ts    # Cookie name, salt rounds, session TTL
│   └── regex.constant.ts   # Email validation regex
├── hooks/
│   └── auth.hook.ts        # requireAuth preHandler
├── routes/
│   ├── index.ts            # Route registration hub
│   ├── health.routes.ts    # GET /health — system + DB status
│   ├── auth.routes.ts      # signup · signin · signout · me
│   └── movie.routes.ts     # CRUD for movies
├── schemas/
│   ├── shared.schema.ts    # Shared TypeBox types (ErrorBody, etc.)
│   ├── users.schema.ts     # Mongoose User model
│   └── movie.schema.ts     # Mongoose Movie model
└── utils/
    └── pagination.ts       # parsePagination · paginate helpers
```

---

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- Sessions stored in **httpOnly, SameSite=Lax** cookies — not accessible from JavaScript
- **Constant-time** password comparison to prevent timing attacks
- Sign-in endpoint **rate limited** to 3 requests per minute
- **Helmet** sets secure HTTP headers on every response
- **CORS** restricted to the configured `CLIENT_ORIGIN`
- `sortBy` parameter whitelisted to prevent NoSQL injection

---

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start with hot reload (tsx watch) |
| `npm run build`     | Compile TypeScript to `dist/`     |
| `npm start`         | Run compiled output               |
| `npm run typecheck` | Type-check without emitting       |
