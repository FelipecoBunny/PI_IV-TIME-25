/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import multer from "multer";
import { GridFSBucket, ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { calcularPainelNoJava } from "../services/javaServerClient.js";
import { excluirDadosDosPets } from "../services/petCleanupService.js";
import { validarPet } from "../services/petValidator.js";

const PHOTO_BUCKET = "fotosPets";
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectarTipoImagem(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function buscarPetDoUsuario(db, petIdStr, userIdStr, options = {}) {
  if (!ObjectId.isValid(petIdStr) || !ObjectId.isValid(userIdStr)) return null;
  return db.collection("pets").findOne(
    { _id: new ObjectId(petIdStr), donoId: new ObjectId(userIdStr) },
    options
  );
}

function formatarRespostaPet(pet) {
  return {
    _id: pet._id,
    nome: pet.nome,
    especie: pet.especie,
    raca: pet.raca || "",
    dataNascimento: pet.dataNascimento,
    peso: pet.peso,
    sexo: pet.sexo || "",
    comprimentoCm: pet.comprimentoCm ?? null,
    alturaCm: pet.alturaCm ?? null,
    temFoto: Boolean(pet.fotoId),
    criadoEm: pet.criadoEm || null,
    atualizadoEm: pet.atualizadoEm || null,
  };
}

const uploadFotoPet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_PHOTO_MIMES.has(file.mimetype)) {
      const err = new Error("Envie uma imagem JPEG, PNG ou WebP.");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).single("foto");

export const uploadFotoPetMiddleware = (req, res, next) => {
  uploadFotoPet(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "A foto pode ter no máximo 2 MB." });
      }
      return res.status(400).json({ message: "Erro no envio da foto." });
    }
    return res.status(err.status || 400).json({ message: err.message || "Arquivo inválido." });
  });
};

export const cadastrarPet = async (req, res) => {
  try {
    const donoId = req.session.userId;
    const { erro, dados } = validarPet(req.body);

    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const db = getDatabase();
    const novoPet = {
      ...dados,
      donoId: new ObjectId(donoId),
      criadoEm: new Date(),
    };

    const result = await db.collection("pets").insertOne(novoPet);

    res.status(201).json({
      message: "Pet cadastrado com sucesso.",
      petId: result.insertedId,
    });
  } catch (error) {
    console.error("[PetController] Erro ao cadastrar pet:", error);
    res.status(500).json({ message: "Erro interno do servidor ao processar o cadastro." });
  }
};

export const listarPets = async (req, res) => {
  try {
    const db = getDatabase();
    const pets = await db
      .collection("pets")
      .find({ donoId: new ObjectId(req.session.userId) })
      .project({ nome: 1, especie: 1, raca: 1, dataNascimento: 1, fotoId: 1 })
      .toArray();

    // Informa se o pet tem foto sem expor o fotoId interno do GridFS
    res.json(
      pets.map(({ fotoId, ...pet }) => ({
        ...pet,
        temFoto: Boolean(fotoId),
      }))
    );
  } catch (error) {
    console.error("[PetController] Erro ao listar pets:", error);
    res.status(500).json({ message: "Erro ao listar pets." });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId);
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });

    const petId = pet._id;

    // Busca dados do dashboard
    const [vaccines, medications, consultations, medicationLogs] = await Promise.all([
      db.collection("vaccines").find({ petId }).toArray(),
      db.collection("medications").find({ petId }).toArray(),
      db.collection("consultations").find({ petId }).toArray(),
      db.collection("medicationLogs").find({ petId }).toArray(),
    ]);

    // Data de hoje no fuso de São Paulo no formato YYYY-MM-DD
    const hojeStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());

    const painel = await calcularPainelNoJava({
      pet,
      vaccines,
      medications,
      medicationLogs,
      consultations,
      hojeStr,
    });

    res.json(painel);
  } catch (error) {
    console.error("[PetController] Erro no dashboard:", error);
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "Servidor Java de cálculo indisponível na porta 4000." });
    }
    res.status(500).json({ message: "Erro ao gerar dashboard." });
  }
};

export const obterPet = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    res.json(formatarRespostaPet(pet));
  } catch (error) {
    console.error("[PetController] Erro ao obter pet:", error);
    res.status(500).json({ message: "Erro interno ao carregar dados do pet." });
  }
};

export const atualizarPet = async (req, res) => {
  try {
    const db = getDatabase();
    const petExistente = await buscarPetDoUsuario(db, req.params.petId, req.session.userId);
    if (!petExistente) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const { erro, dados } = validarPet(req.body);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const $set = {
      ...dados,
      atualizadoEm: new Date(),
    };

    const $unset = {};
    for (const campo of ["sexo", "comprimentoCm", "alturaCm"]) {
      if (!(campo in dados)) {
        $unset[campo] = "";
      }
    }

    const updateOp = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
    const atualizado = await db.collection("pets").findOneAndUpdate(
      { _id: petExistente._id },
      updateOp,
      { returnDocument: "after" }
    );

    res.json({
      message: "Dados do pet atualizados com sucesso.",
      ...formatarRespostaPet(atualizado),
    });
  } catch (error) {
    console.error("[PetController] Erro ao atualizar pet:", error);
    res.status(500).json({ message: "Erro interno ao atualizar dados do pet." });
  }
};

export const excluirPet = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId, {
      projection: { _id: 1 },
    });
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    await excluirDadosDosPets(db, [pet._id]);
    res.json({ message: "Pet excluído com sucesso." });
  } catch (error) {
    console.error("[PetController] Erro ao excluir pet:", error);
    res.status(500).json({ message: "Erro interno ao excluir pet." });
  }
};

export const enviarFotoPet = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Nenhuma imagem enviada." });
    }

    const tipoReal = detectarTipoImagem(req.file.buffer);
    if (!tipoReal) {
      return res.status(400).json({ message: "Arquivo inválido. Envie uma imagem JPEG, PNG ou WebP." });
    }

    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId, {
      projection: { _id: 1, fotoId: 1 },
    });
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
    const novoFileId = await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(`pet-${pet._id}`, {
        contentType: tipoReal,
        metadata: { petId: pet._id },
      });
      uploadStream.on("error", reject);
      uploadStream.on("finish", () => resolve(uploadStream.id));
      uploadStream.end(req.file.buffer);
    });

    await db.collection("pets").updateOne(
      { _id: pet._id },
      { $set: { fotoId: novoFileId, atualizadoEm: new Date() } }
    );

    if (pet.fotoId) {
      try {
        const anteriorId = pet.fotoId instanceof ObjectId ? pet.fotoId : new ObjectId(pet.fotoId);
        await bucket.delete(anteriorId);
      } catch {
        // Ignora caso a foto anterior já não exista
      }
    }

    res.json({ message: "Foto do pet atualizada com sucesso.", temFoto: true });
  } catch (error) {
    console.error("[PetController] Erro ao salvar foto do pet:", error);
    res.status(500).json({ message: "Erro interno ao salvar foto do pet." });
  }
};

export const obterFotoPet = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId, {
      projection: { fotoId: 1 },
    });

    if (!pet || !pet.fotoId) {
      return res.status(404).json({ message: "Foto do pet não encontrada." });
    }

    const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
    const fotoId = pet.fotoId instanceof ObjectId ? pet.fotoId : new ObjectId(pet.fotoId);

    const files = await bucket.find({ _id: fotoId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ message: "Foto do pet não encontrada." });
    }

    res.setHeader("Content-Type", files[0].contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, no-cache");

    const downloadStream = bucket.openDownloadStream(fotoId);
    downloadStream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Erro ao ler foto do pet." });
      }
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error("[PetController] Erro ao carregar foto do pet:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno ao carregar foto do pet." });
    }
  }
};

export const removerFotoPet = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await buscarPetDoUsuario(db, req.params.petId, req.session.userId, {
      projection: { _id: 1, fotoId: 1 },
    });
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    if (pet.fotoId) {
      const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
      try {
        const fotoId = pet.fotoId instanceof ObjectId ? pet.fotoId : new ObjectId(pet.fotoId);
        await bucket.delete(fotoId);
      } catch {
        // Ignora caso já tenha sido removida
      }
      await db.collection("pets").updateOne(
        { _id: pet._id },
        { $unset: { fotoId: "" }, $set: { atualizadoEm: new Date() } }
      );
    }

    res.json({ message: "Foto do pet removida com sucesso.", temFoto: false });
  } catch (error) {
    console.error("[PetController] Erro ao remover foto do pet:", error);
    res.status(500).json({ message: "Erro interno ao remover foto do pet." });
  }
};
