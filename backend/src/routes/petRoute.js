/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import express from 'express';
import { cadastrarPet, listarPets, getDashboard } from '../controllers/petController.js';
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listarConsultas,
  criarConsulta,
  atualizarConsulta,
  excluirConsulta,
  listarDocumentos,
  enviarDocumentos,
  baixarDocumento,
  uploadMiddleware
} from '../controllers/consultaController.js';


const router = express.Router();

router.post('/', requireAuth, cadastrarPet);
router.get('/', requireAuth, listarPets);
router.get('/:petId/dashboard', requireAuth, getDashboard);

// Consultas e documentos
router.get('/:petId/consultas', requireAuth, listarConsultas);
router.post('/:petId/consultas', requireAuth, criarConsulta);
router.put('/:petId/consultas/:consultaId', requireAuth, atualizarConsulta);
router.delete('/:petId/consultas/:consultaId', requireAuth, excluirConsulta);
router.get('/:petId/consultas/:consultaId/documentos', requireAuth, listarDocumentos);
router.post('/:petId/consultas/:consultaId/documentos', requireAuth, uploadMiddleware, enviarDocumentos);
router.get('/:petId/consultas/:consultaId/documentos/:docId/arquivo', requireAuth, baixarDocumento);


export default router;
