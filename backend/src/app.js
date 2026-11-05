/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/database.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import petRoutes from "./routes/petRoute.js";
const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webPath = path.resolve(__dirname, "../../web");

app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false
}));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 8 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", application: "PetHealth" });
});

app.use(express.static(webPath));

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

try {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`PetHealth disponível em http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Falha ao iniciar:", error.message);
  process.exit(1);
}