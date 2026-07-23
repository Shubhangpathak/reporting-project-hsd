require("dotenv").config({ quiet: true });

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const createPgSession = require("connect-pg-simple");
const { connectDatabase } = require("./db");
const { authRouter } = require("./routes/auth");

const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "../frontend/dist");
const sessionMaxAge = 7 * 24 * 60 * 60 * 1000;

function createApp(database) {
  const app = express();
  const PgSession = createPgSession(session);

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.locals.database = database;
  app.use((request, response, next) => {
    response.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });
  app.use(session({
    name: "hsd.sid",
    store: new PgSession({
      pool: database,
      tableName: "user_sessions",
      createTableIfMissing: false,
      disableTouch: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionMaxAge,
    },
  }));

  app.get("/api/health", (request, response) => {
    response.json({ status: "ok", service: "backend" });
  });

  app.use("/api/auth", authRouter);
  app.use(express.static(frontendPath));
  app.get("/{*splat}", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      return next();
    }

    response.sendFile("index.html", { root: frontendPath });
  });
  app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
      return response.status(400).json({
        error: { code: "INVALID_JSON", message: "The request body is not valid JSON." },
      });
    }

    console.error(error);
    return response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
  });

  return app;
}

async function startServer() {
  const databaseUrl = process.env.DATABASE_URL;
  const requiredVariables = ["DATABASE_URL", "CLIENT_ORIGIN", "GOOGLE_AUTH_CLIENT_ID", "SESSION_SECRET"];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    console.error(`Missing backend environment variables: ${missingVariables.join(", ")}`);
    process.exit(1);
  }

  if (Buffer.byteLength(process.env.SESSION_SECRET, "utf8") < 32) {
    console.error("SESSION_SECRET must contain at least 32 bytes.");
    process.exit(1);
  }

  try {
    const database = await connectDatabase(databaseUrl);
    const app = createApp(database);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch {
    console.error("Could not connect to PostgreSQL. Check DATABASE_URL and make sure the database is available.");
    process.exit(1);
  }
}

startServer();
