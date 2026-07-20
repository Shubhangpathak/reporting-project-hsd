# Full-Stack Starter

## Installation

Install Node.js 24 LTS and MongoDB, then install the workspace dependencies:

```bash
npm install
```

## Environment setup

Copy `fe/.env.example` to `fe/.env` and `be/.env.example` to `be/.env`, then update the values for your environment.

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
- `npm run dev --workspace fe` starts only the frontend.
- `npm run dev --workspace be` starts only the backend.
- `npm run preview --workspace fe` previews the frontend build.
- `npm run start --workspace be` starts only the backend.

## Project structure

```text
.
├── fe/
│   └── src/
├── be/
│   └── routes/
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```
