# Waldo API

An Express API for the Where’s Waldo game. It currently exposes scene data from PostgreSQL and serves the game images as static files. Prisma is used to access the database.

## Requirements

- Node.js (an active LTS release is recommended)
- PostgreSQL

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root. Set `DATABASE_URL` to a PostgreSQL connection string for your database. Optionally set `PORT`; the API defaults to port `5000`.

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public"
   PORT=5000
   ```

   URL-encode special characters in the database username or password. Keep `.env` private and do not commit database credentials.

3. Apply the Prisma schema and generate the client:

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

   `prisma:migrate` runs `prisma migrate dev`, which creates a development migration when needed.

4. Start the API:

   ```bash
   npm run dev
   ```

   For a regular Node.js start, run `npm start`.

## API

### List scenes

```http
GET /api/games
```

Returns an array of scenes with the fields defined by the Prisma `Scene` model, including `id`, `name`, `description`, `imageUrl`, `width`, and `height`. A database error returns HTTP `500` with an error message.

Example response:

```json
[
  {
    "id": 1,
    "name": "Beach",
    "imageUrl": "/images/Wheres-Waldo-Beach-Super-High-Resolution-scaled-B27IRiag.jpg",
    "width": 1920,
    "height": 1080,
    "description": "Find Waldo at the beach"
  }
]
```

### Game images

Images in `src/public/images` are served from `/images`. For example:

```text
http://localhost:5000/images/Wheres-Waldo-Beach-Super-High-Resolution-scaled-B27IRiag.jpg
```

Store the corresponding `/images/<filename>` path in a scene’s `imageUrl` field. The API does not currently include related characters in the scene response.

## Database schema

- `Scene` stores a game scene and its image path, dimensions, and description.
- `Character` stores a character and optional image path.
- `SceneCharacter` links characters to scenes and stores their target coordinates and radius. Each scene-character pair must be unique.

The API currently exposes only the scene list endpoint; other models are defined in the schema but do not yet have API routes.

## Development notes

- The server entry point is `src/index.js`; Express middleware and routes are configured in `src/app.js`.
- Prisma reads `DATABASE_URL` from `.env` through `prisma.config.ts` and the PostgreSQL adapter.
- CORS currently permits `http://localhost:5173` and `http://localhost:5174`.
- The included images are served from the API host, so clients should use that host when resolving the `/images/...` paths returned by the API.
