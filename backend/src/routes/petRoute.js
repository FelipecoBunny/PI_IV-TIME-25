/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import express from 'express';
import { cadastrarPet, listarPets, getDashboard } from '../controllers/petController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/', requireAuth, cadastrarPet);
router.get('/', requireAuth, listarPets);
router.get('/:petId/dashboard', requireAuth, getDashboard);

export default router;