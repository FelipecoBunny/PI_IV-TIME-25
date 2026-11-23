/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
import { getDatabase } from "../config/database.js";

const TIME_ZONE = "America/Sao_Paulo";
const BUCKET_NAME = "vacinaDocumentos";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;
const DOSES_VALIDAS = new Set(["1ª dose", "2ª dose", "3ª dose", "Reforço", "Dose única"]);

function getHojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function isDataISO(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim());
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

function validarPayloadVacina(body, hojeSP) {
  const {
    status,
    titulo,
    dose,
    dataAplicacao,
    proximaDose,
    lote,
    fabricante,
    local,
    veterinario,
    observacoes,
  } = body || {};

  if (status !== "aplicada" && status !== "pendente") {
    return { erro: "Situação da vacina inválida." };
  }
  if (!titulo || typeof titulo !== "string" || titulo.trim().length < 2 || titulo.trim().length > 100) {
    return { erro: "Informe o nome da vacina (entre 2 e 100 caracteres)." };
  }
  if (!dose || typeof dose !== "string" || !DOSES_VALIDAS.has(dose.trim())) {
    return { erro: "Selecione uma dose válida." };
  }

  const dados = {
    status,
    titulo: titulo.trim(),
    dose: dose.trim(),
  };

  if (status === "aplicada") {
    if (!isDataISO(dataAplicacao)) {
      return { erro: "Informe uma data de aplicação válida." };
    }
    const dataAp = dataAplicacao.trim();
    if (dataAp > hojeSP) {
      return { erro: "A data da aplicação não pode estar no futuro." };
    }
    if (!local || typeof local !== "string" || local.trim().length < 2 || local.trim().length > 150) {
      return { erro: "Informe a clínica ou o local da aplicação." };
    }
    if (!veterinario || typeof veterinario !== "string" || veterinario.trim().length < 2 || veterinario.trim().length > 100) {
      return { erro: "Informe o médico veterinário responsável." };
    }

    dados.dataAplicacao = dataAp;
    dados.local = local.trim();
    dados.veterinario = veterinario.trim();

    if (proximaDose && typeof proximaDose === "string" && proximaDose.trim()) {
      if (!isDataISO(proximaDose)) {
        return { erro: "Data da próxima dose inválida." };
      }
      const prox = proximaDose.trim();
      if (prox < dataAp) {
        return { erro: "A próxima dose não pode ser anterior à data da aplicação." };
      }
      dados.proximaDose = prox;
    }

    if (lote && typeof lote === "string" && lote.trim()) {
      dados.lote = lote.trim().slice(0, 60);
    }
    if (fabricante && typeof fabricante === "string" && fabricante.trim()) {
      dados.fabricante = fabricante.trim().slice(0, 80);
    }
  } else {
    if (!isDataISO(proximaDose)) {
      return { erro: "Informe a data esperada para agendar a dose." };
    }
    dados.proximaDose = proximaDose.trim();

    if (local && typeof local === "string" && local.trim()) {
      dados.local = local.trim().slice(0, 150);
    }
    if (veterinario && typeof veterinario === "string" && veterinario.trim()) {
      dados.veterinario = veterinario.trim().slice(0, 100);
    }
  }

  if (observacoes && typeof observacoes === "string" && observacoes.trim()) {
    dados.observacoes = observacoes.trim().slice(0, 500);
  }

  return { dados };
}

// Middleware Multer em memória
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

export const uploadVacinaMiddleware = (req, res, next) => {
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

export const listarVacinas = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const todas = await db
      .collection("vaccines")
      .find({ petId: pet._id })
      .toArray();

    const mapearVacina = (v) => ({
      _id: v._id,
      titulo: v.titulo,
      dose: v.dose || "",
      status: v.status,
      dataAplicacao: v.dataAplicacao || "",
      proximaDose: v.proximaDose || "",
      lote: v.lote || "",
      fabricante: v.fabricante || "",
      local: v.local || "",
      veterinario: v.veterinario || "",
      observacoes: v.observacoes || "",
      totalDocumentos: Array.isArray(v.documentos) ? v.documentos.length : 0,
    });

    const aplicadas = todas
      .filter((v) => v.status === "aplicada")
      .sort((a, b) => String(b.dataAplicacao || "").localeCompare(String(a.dataAplicacao || "")))
      .map(mapearVacina);

    const proximas = todas
      .filter((v) => v.status === "pendente")
      .sort((a, b) => String(a.proximaDose || "").localeCompare(String(b.proximaDose || "")))
      .map(mapearVacina);

    res.json({
      pet: { nome: pet.nome },
      aplicadas,
      proximas,
    });
  } catch (error) {
    console.error("[VacinaController] Erro ao listar vacinas:", error);
    res.status(500).json({ message: "Erro interno ao buscar vacinas." });
  }
};

export const criarVacina = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const { erro, dados } = validarPayloadVacina(req.body, getHojeSP());
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const novaVacina = {
      petId: pet._id,
      ...dados,
      documentos: [],
      criadoEm: new Date(),
    };

    const result = await db.collection("vaccines").insertOne(novaVacina);

    res.status(201).json({
      message: "Vacina registrada com sucesso.",
      vacinaId: result.insertedId,
    });
  } catch (error) {
    console.error("[VacinaController] Erro ao criar vacina:", error);
    res.status(500).json({ message: "Erro interno ao salvar vacina." });
  }
};

export const atualizarVacina = async (req, res) => {
  try {
    const { petId, vacinaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacinaExistente = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacinaExistente) {
      return res.status(404).json({ message: "Vacina não encontrada." });
    }

    const { erro, dados } = validarPayloadVacina(req.body, getHojeSP());
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const camposOpcionais = [
      "dataAplicacao",
      "proximaDose",
      "lote",
      "fabricante",
      "local",
      "veterinario",
      "observacoes",
    ];

    const $set = {
      ...dados,
      atualizadoEm: new Date(),
    };
    const $unset = {};
    for (const campo of camposOpcionais) {
      if (!(campo in dados)) {
        $unset[campo] = "";
      }
    }

    const updateOp = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
    await db.collection("vaccines").updateOne({ _id: vacinaExistente._id }, updateOp);

    res.json({ message: "Vacina atualizada com sucesso." });
  } catch (error) {
    console.error("[VacinaController] Erro ao atualizar vacina:", error);
    res.status(500).json({ message: "Erro interno ao atualizar vacina." });
  }
};

export const excluirVacina = async (req, res) => {
  try {
    const { petId, vacinaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacina = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacina) {
      return res.status(404).json({ message: "Vacina não encontrada." });
    }

    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    for (const doc of vacina.documentos || []) {
      if (doc.fileId) {
        try {
          const fid = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(doc.fileId);
          await bucket.delete(fid);
        } catch {
          // Ignora caso o arquivo não exista ou já tenha sido removido
        }
      }
    }

    await db.collection("vaccines").deleteOne({ _id: vacina._id });
    res.json({ message: "Vacina excluída com sucesso." });
  } catch (error) {
    console.error("[VacinaController] Erro ao excluir vacina:", error);
    res.status(500).json({ message: "Erro interno ao excluir vacina." });
  }
};

export const listarDocumentosVacina = async (req, res) => {
  try {
    const { petId, vacinaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacina = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacina) {
      return res.status(404).json({ message: "Vacina não encontrada." });
    }

    const docs = (vacina.documentos || []).map((doc) => ({
      _id: doc._id,
      nome: doc.nome,
      tipo: doc.tipo,
      url: `/api/pets/${pet._id}/vacinas/${vacina._id}/documentos/${doc._id}/arquivo`,
    }));

    res.json(docs);
  } catch (error) {
    console.error("[VacinaController] Erro ao listar documentos:", error);
    res.status(500).json({ message: "Erro interno ao listar documentos." });
  }
};

export const enviarDocumentosVacina = async (req, res) => {
  try {
    const { petId, vacinaId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacina = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacina) {
      return res.status(404).json({ message: "Vacina não encontrada." });
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
            vacinaId: vacina._id,
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

    await db.collection("vaccines").updateOne(
      { _id: vacina._id },
      { $push: { documentos: { $each: novosDocs } } }
    );

    res.status(201).json(
      novosDocs.map((doc) => ({
        _id: doc._id,
        nome: doc.nome,
        tipo: doc.tipo,
        url: `/api/pets/${pet._id}/vacinas/${vacina._id}/documentos/${doc._id}/arquivo`,
      }))
    );
  } catch (error) {
    console.error("[VacinaController] Erro ao enviar documentos:", error);
    res.status(500).json({ message: "Erro interno ao salvar documentos." });
  }
};

export const baixarDocumentoVacina = async (req, res) => {
  try {
    const { petId, vacinaId, docId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId) || !ObjectId.isValid(docId)) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacina = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacina) {
      return res.status(404).json({ message: "Vacina não encontrada." });
    }

    const doc = (vacina.documentos || []).find((d) => String(d._id) === docId);
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
    console.error("[VacinaController] Erro ao baixar documento:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno ao abrir documento." });
    }
  }
};

export const excluirDocumentoVacina = async (req, res) => {
  try {
    const { petId, vacinaId, docId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(vacinaId) || !ObjectId.isValid(docId)) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const vacina = await db.collection("vaccines").findOne({
      _id: new ObjectId(vacinaId),
      petId: pet._id,
    });
    if (!vacina) {
      return res.status(404).json({ message: "Vacina não encontrada." });
    }

    const doc = (vacina.documentos || []).find((d) => String(d._id) === docId);
    if (!doc) {
      return res.status(404).json({ message: "Documento não encontrado." });
    }

    await db.collection("vaccines").updateOne(
      { _id: vacina._id },
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
    console.error("[VacinaController] Erro ao excluir documento:", error);
    res.status(500).json({ message: "Erro interno ao excluir documento." });
  }
};