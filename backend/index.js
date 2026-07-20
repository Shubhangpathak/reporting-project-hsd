require("dotenv").config({ quiet: true });

const path = require("node:path");
const cors = require("cors");
const express = require("express");
const { connectDatabase } = require("./db");
const { adminRouter } = require("./routes/admin");
const { userRouter } = require("./routes/user");

const app = express();
const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    service: "backend",
  });
});

app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use(express.static(frontendPath));

async function startServer() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is missing. Add it to backend/.env before starting the server.");
    process.exit(1);
  }

  try {
    app.locals.database = await connectDatabase(databaseUrl);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch {
    console.error("Could not connect to PostgreSQL. Check DATABASE_URL and make sure the database is available.");
    process.exit(1);
  }
}

startServer();
