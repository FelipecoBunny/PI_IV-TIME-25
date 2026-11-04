import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/database.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webPath = path.resolve(__dirname, "../../web");

app.use(express.json());

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