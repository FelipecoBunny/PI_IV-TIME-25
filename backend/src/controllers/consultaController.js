/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
import { getDatabase } from "../config/database.js";

const TIME_ZONE = "America/Sao_Paulo";
const BUCKET_NAME = "consultaDocumentos";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

function getAgoraSP() {
  const agora = new Date();
  const data = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(agora);
  const horario = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(agora);
  return { data, horario };
}

function jaPassou(dataStr, horarioStr, agoraSP) {
  const d = String(dataStr || "").slice(0, 10);
  if (!d) return false;
  if (d < agoraSP.data) return true;
  if (d > agoraSP.data) return false;
  const h = String(horarioStr || "00:00").slice(0, 5);
  return h <= agoraSP.horario;
}

function diffDias(dataPassadaISO, hojeISO) {
  const [y1, m1, d1] = String(dataPassadaISO).slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = String(hojeISO).slice(0, 10).split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.max(0, Math.floor((utc2 - utc1) / 86400000));
}

function sanitizeFilename(nome) {
  const base = String(nome || "arquivo")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base.slice(0, 150) || "arquivo";
}

async function verificarDonoPet(db, petIdStr, userIdStr) {
  if (!ObjectId.isValid(petIdStr) || !ObjectId.isValid(userIdStr)) return null;
  return db.collection("pets").findOne({
    _id: new ObjectId(petIdStr),
    donoId: new ObjectId(userIdStr),
  });
}

// Middleware Multer em memória com validação de tipo, tamanho e quantidade
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    const tipoValido =
      file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");
    if (!tipoValido) {
      const err = new Error("Apenas arquivos PDF ou imagens são permitidos.");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).array("arquivos", MAX_FILES);

export const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Cada arquivo pode ter no máximo 10 MB." });
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "Envie no máximo 5 arquivos por vez." });
      }
      return res.status(400).json({ message: "Erro no envio dos arquivos." });
    }

    return res.status(err.status || 400).json({ message: err.message || "Arquivo inválido." });
  });
};

export const listarConsultas = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const todas = await db
      .collection("consultations")
      .find({ petId: pet._id })
      .toArray();

    const agoraSP = getAgoraSP();
    const vencidasIds = todas
      .filter((c) => c.status === "agendada" && jaPassou(c.data, c.horario, agoraSP))
      .map((c) => c._id);

    if (vencidasIds.length > 0) {
      await db.collection("consultations").updateMany(
        { _id: { $in: vencidasIds } },
        { $set: { status: "realizada", atualizadoEm: new Date() } }
      );
      todas.forEach((c) => {
        if (vencidasIds.some((id) => id.equals(c._id))) {
          c.status = "realizada";
        }
      });
    }

    const realizadas = todas
      .filter((c) => c.status === "realizada")
      .sort((a, b) => {
        const cmpData = String(b.data || "").localeCompare(String(a.data || ""));
        if (cmpData !== 0) return cmpData;
        return String(b.horario || "").localeCompare(String(a.horario || ""));
      });

    const agendadas = todas
      .filter((c) => c.status === "agendada")
      .sort((a, b) => {
        const cmpData = String(a.data || "").localeCompare(String(b.data || ""));
        if (cmpData !== 0) return cmpData;
        return String(a.horario || "").localeCompare(String(b.horario || ""));
      });

    const ultimaData = realizadas.length > 0 ? realizadas[0].data : null;
    const diasDesdeUltimaConsulta = ultimaData ? diffDias(ultimaData, agoraSP.data) : null;

    const historico = realizadas.map((c) => ({
      _id: c._id,
      motivo: c.motivo,
      data: c.data,
      horario: c.horario,
      local: c.local,
      medico: c.veterinario,
      diagnostico: c.diagnostico || "",
      observacoes: c.observacoes || "",
      totalDocumentos: Array.isArray(c.documentos) ? c.documentos.length : 0,
    }));

    const proximas = agendadas.map((c) => ({
      _id: c._id,
      titulo: c.motivo,
      data: c.data,
      horario: c.horario,
      local: c.local || "",
      medico: c.veterinario || "",
    }));


    res.json({
      pet: { nome: pet.nome },
      diasDesdeUltimaConsulta,
      historico,
      proximas,
    });
  } catch (error) {
    console.error("[ConsultaController] Erro ao listar consultas:", error);
    res.status(500).json({ message: "Erro interno ao buscar consultas." });
  }
};

export const criarConsulta = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    let { motivo, data, horario, local, veterinario, diagnostico, observacoes } = req.body;

    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 2 || motivo.trim().length > 120) {
      return res.status(400).json({ message: "Informe o motivo da consulta (entre 2 e 120 caracteres)." });
    }
    if (!data || typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ message: "Data da consulta inválida." });
    }
    if (!horario || typeof horario !== "string" || !/^\d{2}:\d{2}$/.test(horario)) {
      return res.status(400).json({ message: "Horário da consulta inválido." });
    }
    if (!local || typeof local !== "string" || local.trim().length < 2 || local.trim().length > 150) {
      return res.status(400).json({ message: "Informe o local da consulta." });
    }
    if (!veterinario || typeof veterinario !== "string" || veterinario.trim().length < 2 || veterinario.trim().length > 100) {
      return res.status(400).json({ message: "Informe o médico veterinário responsável." });
    }

    const agoraSP = getAgoraSP();
    const statusCalculado = jaPassou(data.trim(), horario.trim(), agoraSP)
      ? "realizada"
      : "agendada";

    const novaConsulta = {
      petId: pet._id,
      motivo: motivo.trim(),
      data: data.trim(),
      horario: horario.trim(),
      local: local.trim(),
      veterinario: veterinario.trim(),
      status: statusCalculado,
      documentos: [],
      criadoEm: new Date(),
    };

    if (statusCalculado === "realizada") {
      if (diagnostico && typeof diagnostico === "string" && diagnostico.trim()) {
        novaConsulta.diagnostico = diagnostico.trim().slice(0, 200);
      }
      if (observacoes && typeof observacoes === "string" && observacoes.trim()) {
        novaConsulta.observacoes = observacoes.trim().slice(0, 500);
      }
    }

    const result = await db.collection("consultations").insertOne(novaConsulta);

    res.status(201).json({
      message: "Consulta registrada com sucesso.",
      consultaId: result.insertedId,
    });
  } catch (error) {
    console.error("[ConsultaController] Erro ao criar consulta:", error);
    res.status(500).json({ message: "Erro interno ao salvar consulta." });
  }
};

export const atualizarConsulta = async (req, res) => {
  try {
    const { petId, consultaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consultaExistente = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consultaExistente) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    let { motivo, data, horario, local, veterinario, diagnostico, observacoes } = req.body;

    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 2 || motivo.trim().length > 120) {
      return res.status(400).json({ message: "Informe o motivo da consulta (entre 2 e 120 caracteres)." });
    }
    if (!data || typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ message: "Data da consulta inválida." });
    }
    if (!horario || typeof horario !== "string" || !/^\d{2}:\d{2}$/.test(horario)) {
      return res.status(400).json({ message: "Horário da consulta inválido." });
    }
    if (!local || typeof local !== "string" || local.trim().length < 2 || local.trim().length > 150) {
      return res.status(400).json({ message: "Informe o local da consulta." });
    }
    if (!veterinario || typeof veterinario !== "string" || veterinario.trim().length < 2 || veterinario.trim().length > 100) {
      return res.status(400).json({ message: "Informe o médico veterinário responsável." });
    }

    const agoraSP = getAgoraSP();
    const statusCalculado = jaPassou(data.trim(), horario.trim(), agoraSP)
      ? "realizada"
      : "agendada";

    const $set = {
      motivo: motivo.trim(),
      data: data.trim(),
      horario: horario.trim(),
      local: local.trim(),
      veterinario: veterinario.trim(),
      status: statusCalculado,
      atualizadoEm: new Date(),
    };

    const $unset = {};
    if (statusCalculado === "realizada") {
      if (diagnostico && typeof diagnostico === "string" && diagnostico.trim()) {
        $set.diagnostico = diagnostico.trim().slice(0, 200);
      } else {
        $unset.diagnostico = "";
      }
      if (observacoes && typeof observacoes === "string" && observacoes.trim()) {
        $set.observacoes = observacoes.trim().slice(0, 500);
      } else {
        $unset.observacoes = "";
      }
    } else {
      $unset.diagnostico = "";
      $unset.observacoes = "";
    }

    const updateOp = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
    await db.collection("consultations").updateOne({ _id: consultaExistente._id }, updateOp);

    res.json({ message: "Consulta atualizada com sucesso." });
  } catch (error) {
    console.error("[ConsultaController] Erro ao atualizar consulta:", error);
    res.status(500).json({ message: "Erro interno ao atualizar consulta." });
  }
};

export const excluirConsulta = async (req, res) => {
  try {
    const { petId, consultaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consulta = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consulta) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    for (const doc of consulta.documentos || []) {
      if (doc.fileId) {
        try {
          const fid = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(doc.fileId);
          await bucket.delete(fid);
        } catch {
          // Ignora caso o arquivo não exista ou já tenha sido removido
        }
      }
    }

    await db.collection("consultations").deleteOne({ _id: consulta._id });
    res.json({ message: "Consulta excluída com sucesso." });
  } catch (error) {
    console.error("[ConsultaController] Erro ao excluir consulta:", error);
    res.status(500).json({ message: "Erro interno ao excluir consulta." });
  }
};

export const listarDocumentos = async (req, res) => {
  try {
    const { petId, consultaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consulta = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consulta) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    const docs = (consulta.documentos || []).map((doc) => ({
      _id: doc._id,
      nome: doc.nome,
      tipo: doc.tipo,
      url: `/api/pets/${pet._id}/consultas/${consulta._id}/documentos/${doc._id}/arquivo`,
    }));

    res.json(docs);
  } catch (error) {
    console.error("[ConsultaController] Erro ao listar documentos:", error);
    res.status(500).json({ message: "Erro interno ao listar documentos." });
  }
};

export const enviarDocumentos = async (req, res) => {
  try {
    const { petId, consultaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consulta = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consulta) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Nenhum arquivo enviado." });
    }

    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    const novosDocs = [];

    for (const file of req.files) {
      const nomeLimpo = sanitizeFilename(file.originalname);

      const fileId = await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(nomeLimpo, {
          contentType: file.mimetype,
          metadata: {
            petId: pet._id,
            consultaId: consulta._id,
          },
        });
        uploadStream.on("error", reject);
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.end(file.buffer);
      });

      novosDocs.push({
        _id: new ObjectId(),
        nome: nomeLimpo,
        tipo: file.mimetype,
        tamanho: file.size,
        fileId,
        enviadoEm: new Date(),
      });
    }

    await db.collection("consultations").updateOne(
      { _id: consulta._id },
      { $push: { documentos: { $each: novosDocs } } }
    );

    res.status(201).json(
      novosDocs.map((doc) => ({
        _id: doc._id,
        nome: doc.nome,
        tipo: doc.tipo,
        url: `/api/pets/${pet._id}/consultas/${consulta._id}/documentos/${doc._id}/arquivo`,
      }))
    );
  } catch (error) {
    console.error("[ConsultaController] Erro ao enviar documentos:", error);
    res.status(500).json({ message: "Erro interno ao salvar documentos." });
  }
};

export const baixarDocumento = async (req, res) => {
  try {
    const { petId, consultaId, docId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId) || !ObjectId.isValid(docId)) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consulta = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consulta) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    const doc = (consulta.documentos || []).find((d) => String(d._id) === docId);
    if (!doc || !doc.fileId) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(doc.fileId);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ message: "Arquivo não encontrado no armazenamento." });
    }

    res.setHeader("Content-Type", doc.tipo || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.nome)}"`
    );

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Erro ao ler o arquivo." });
      }
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error("[ConsultaController] Erro ao baixar documento:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno ao abrir documento." });
    }
  }
};

export const excluirDocumento = async (req, res) => {
  try {
    const { petId, consultaId, docId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(consultaId) || !ObjectId.isValid(docId)) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const consulta = await db.collection("consultations").findOne({
      _id: new ObjectId(consultaId),
      petId: pet._id,
    });
    if (!consulta) {
      return res.status(404).json({ message: "Consulta não encontrada." });
    }

    const doc = (consulta.documentos || []).find((d) => String(d._id) === docId);
    if (!doc) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    await db.collection("consultations").updateOne(
      { _id: consulta._id },
      {
        $pull: { documentos: { _id: doc._id } },
        $set: { atualizadoEm: new Date() },
      }
    );

    if (doc.fileId) {
      const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
      try {
        const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(doc.fileId);
        await bucket.delete(fileId);
      } catch {
        // Ignora caso o arquivo já tenha sido removido do GridFS
      }
    }

    res.json({ message: "Documento excluído com sucesso." });
  } catch (error) {
    console.error("[ConsultaController] Erro ao excluir documento:", error);
    res.status(500).json({ message: "Erro interno ao excluir documento." });
  }
};