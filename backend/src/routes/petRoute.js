/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import express from 'express';
import {
  cadastrarPet,
  listarPets,
  getDashboard,
  obterPet,
  atualizarPet,
  excluirPet,
  uploadFotoPetMiddleware,
  enviarFotoPet,
  obterFotoPet,
  removerFotoPet
} from '../controllers/petController.js';
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
import {
  listarVacinas,
  criarVacina,
  atualizarVacina,
  excluirVacina,
  listarDocumentosVacina,
  enviarDocumentosVacina,
  baixarDocumentoVacina,
  uploadVacinaMiddleware
} from '../controllers/vacinaController.js';
import {
  listarMedicamentos,
  criarMedicamento,
  atualizarMedicamento,
  alterarStatusMedicamento,
  excluirMedicamento,
  registrarDose,
  desfazerDose
} from '../controllers/medicamentoController.js';

const router = express.Router();

router.post('/', requireAuth, cadastrarPet);
router.get('/', requireAuth, listarPets);
router.get('/:petId/dashboard', requireAuth, getDashboard);

// Pet individual e foto
router.get('/:petId', requireAuth, obterPet);
router.put('/:petId', requireAuth, atualizarPet);
router.delete('/:petId', requireAuth, excluirPet);
router.get('/:petId/foto', requireAuth, obterFotoPet);
router.put('/:petId/foto', requireAuth, uploadFotoPetMiddleware, enviarFotoPet);
router.delete('/:petId/foto', requireAuth, removerFotoPet);

// Consultas e documentos
router.get('/:petId/consultas', requireAuth, listarConsultas);
router.post('/:petId/consultas', requireAuth, criarConsulta);
router.put('/:petId/consultas/:consultaId', requireAuth, atualizarConsulta);
router.delete('/:petId/consultas/:consultaId', requireAuth, excluirConsulta);
router.get('/:petId/consultas/:consultaId/documentos', requireAuth, listarDocumentos);
router.post('/:petId/consultas/:consultaId/documentos', requireAuth, uploadMiddleware, enviarDocumentos);
router.get('/:petId/consultas/:consultaId/documentos/:docId/arquivo', requireAuth, baixarDocumento);

// Vacinas e documentos
router.get('/:petId/vacinas', requireAuth, listarVacinas);
router.post('/:petId/vacinas', requireAuth, criarVacina);
router.put('/:petId/vacinas/:vacinaId', requireAuth, atualizarVacina);
router.delete('/:petId/vacinas/:vacinaId', requireAuth, excluirVacina);
router.get('/:petId/vacinas/:vacinaId/documentos', requireAuth, listarDocumentosVacina);
router.post('/:petId/vacinas/:vacinaId/documentos', requireAuth, uploadVacinaMiddleware, enviarDocumentosVacina);
router.get('/:petId/vacinas/:vacinaId/documentos/:docId/arquivo', requireAuth, baixarDocumentoVacina);

// Medicamentos e registro de doses
router.get('/:petId/medicamentos', requireAuth, listarMedicamentos);
router.post('/:petId/medicamentos', requireAuth, criarMedicamento);
router.put('/:petId/medicamentos/:medicamentoId', requireAuth, atualizarMedicamento);
router.put('/:petId/medicamentos/:medicamentoId/status', requireAuth, alterarStatusMedicamento);
router.delete('/:petId/medicamentos/:medicamentoId', requireAuth, excluirMedicamento);
router.post('/:petId/medicamentos/:medicamentoId/doses', requireAuth, registrarDose);
router.delete('/:petId/medicamentos/:medicamentoId/doses', requireAuth, desfazerDose);

export default router;