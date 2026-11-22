/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword,
  uploadFotoMiddleware,
  uploadProfilePhoto,
  getProfilePhoto,
  deleteProfilePhoto,
  deleteAccount
} from "../controllers/authController.js";

const router = express.Router();

// Limite de requisições para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

// Rotas de autenticação
router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
// Limite de tentativas para ações protegidas por senha
const passwordActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { message: "Muitas tentativas incorretas. Tente novamente mais tarde." }
});
router.put("/me", requireAuth, updateMe);
router.put("/me/senha", requireAuth, passwordActionLimiter, updatePassword);
router.get("/me/foto", requireAuth, getProfilePhoto);
router.put("/me/foto", requireAuth, uploadFotoMiddleware, uploadProfilePhoto);
router.delete("/me/foto", requireAuth, deleteProfilePhoto);
router.delete("/me", requireAuth, passwordActionLimiter, deleteAccount);

export default router;