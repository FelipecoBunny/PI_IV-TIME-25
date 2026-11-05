/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { register, login, logout, getMe } from "../controllers/authController.js";

const router = express.Router();

// Limite de requisições para login (5 tentativas a cada 15 minutos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

// Rotas de autenticação
router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;