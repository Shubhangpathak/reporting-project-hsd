# Full-Stack Starter

## Installation

Install Node.js 24 LTS, then install the workspace dependencies:

```bash
npm install
```

## Environment setup

Copy `frontend/.env.example` to `frontend/.env` and `backend/.env.example` to `backend/.env`.

Set `DATABASE_URL` in `backend/.env` to a PostgreSQL connection string. For Neon, copy the pooled connection string from the Connect dialog.

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
