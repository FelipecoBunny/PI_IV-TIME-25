import express from 'express';
import { cadastrarPet } from '../controllers/petController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// O requireAuth garante que a requisição seja rejeitada imediatamente se não houver sessão ativa
router.post('/', requireAuth, cadastrarPet);

export default router;