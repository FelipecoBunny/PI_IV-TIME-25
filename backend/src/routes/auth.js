import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { register, login, logout, getMe } from "../controllers/authController.js";

const router = express.Router();

// Middleware de proteção contra força bruta no login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

// Definição limpa das rotas
router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;