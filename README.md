# Full-Stack Starter

## Installation

Install Node.js 24 LTS, then install the workspace dependencies:

```bash
npm install
```

## Environment setup

Copy `frontend/.env.example` to `frontend/.env` and `backend/.env.example` to `backend/.env`.

Set `DATABASE_URL` to the Neon pooled connection string, set `CLIENT_ORIGIN` to the frontend origin, and generate a random `SESSION_SECRET` containing at least 32 bytes. `VITE_GOOGLE_AUTH_CLIENT_ID` and `GOOGLE_AUTH_CLIENT_ID` must contain the same Google web client ID.

The Google OAuth client secret is not used by this sign-in flow and must not be added to either environment file. Add the frontend URL to the OAuth client's authorized JavaScript origins.

Apply database migrations before starting the application:

```bash
npm run db:migrate
```

## Running the project

Start the frontend and backend development servers:

```bash
npm run dev
```

Build the frontend and serve it through Express:

```bash
npm start
```

## Available scripts

- `npm run dev` starts both development servers.
- `npm run db:migrate` applies pending PostgreSQL migrations.
- `npm run build` builds the frontend.
- `npm start` builds the frontend and starts the backend.
- `npm run dev --workspace frontend` starts only the frontend.
- `npm run dev --workspace backend` starts only the backend.
- `npm run preview --workspace frontend` previews the frontend build.
- `npm run start --workspace backend` starts only the backend.

## Project structure

```text
.
|-- frontend/
|   `-- src/
|-- backend/
|   `-- routes/
|-- package.json
|-- package-lock.json
|-- README.md
`-- .gitignore
```
