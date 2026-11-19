/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import bcrypt from "bcryptjs";
import multer from "multer";
import { GridFSBucket, ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { excluirDadosDosPets } from "../services/petCleanupService.js";

const PHOTO_BUCKET = "fotosPerfil";
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

const uploadFoto = multer({
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

export const uploadFotoMiddleware = (req, res, next) => {
  uploadFoto(req, res, (err) => {
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


// Função auxiliar (validação de e-mail)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
      return res.status(400).json({ message: "Nome deve ter entre 1 e 80 caracteres." });
    }
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ message: "E-mail inválido." });
    }
    if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "A senha deve ter entre 8 e 72 caracteres." });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    const db = getDatabase();
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = { name, email, password: hashedPassword, criadoEm: new Date() };

    try {
      const result = await db.collection("users").insertOne(newUser);
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Erro ao iniciar sessão." });
        req.session.userId = result.insertedId.toString();
        res.status(201).json({ message: "Usuário registrado com sucesso." });
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "E-mail já cadastrado." });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    email = email.trim().toLowerCase();

    const db = getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Erro ao iniciar sessão." });
      req.session.userId = user._id.toString();
      res.json({ message: "Login efetuado com sucesso." });
    });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Erro ao encerrar sessão." });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout realizado com sucesso." });
  });
};

export const getMe = async (req, res) => {
  try {
    const db = getDatabase();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.session.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      telefone: user.telefone || "",
      cidade: user.cidade || "",
      temFoto: Boolean(user.fotoId),
      criadoEm: user.criadoEm || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { name, telefone, cidade } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
      return res.status(400).json({ message: "Nome deve ter entre 1 e 80 caracteres." });
    }

    const $set = { name: name.trim() };
    const $unset = {};

    if (telefone !== undefined && telefone !== null && String(telefone).trim() !== "") {
      if (typeof telefone !== "string" || !/^[\d\s()+-]+$/.test(telefone.trim())) {
        return res.status(400).json({ message: "Telefone inválido. Informe 10 ou 11 dígitos." });
      }
      const digitos = telefone.replace(/\D/g, "");
      if (digitos.length < 10 || digitos.length > 11) {
        return res.status(400).json({ message: "Telefone deve ter 10 ou 11 dígitos." });
      }
      $set.telefone = digitos;
    } else {
      $unset.telefone = "";
    }

    if (cidade !== undefined && cidade !== null && String(cidade).trim() !== "") {
      if (typeof cidade !== "string" || cidade.trim().length > 80) {
        return res.status(400).json({ message: "Cidade deve ter no máximo 80 caracteres." });
      }
      $set.cidade = cidade.trim();
    } else {
      $unset.cidade = "";
    }

    const db = getDatabase();
    const userId = new ObjectId(req.session.userId);
    const updateOp = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };

    const result = await db.collection("users").findOneAndUpdate(
      { _id: userId },
      updateOp,
      { returnDocument: "after", projection: { password: 0 } }
    );

    if (!result) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    res.json({
      message: "Dados atualizados com sucesso.",
      id: result._id,
      name: result.name,
      email: result.email,
      telefone: result.telefone || "",
      cidade: result.cidade || "",
      temFoto: Boolean(result.fotoId),
      criadoEm: result.criadoEm || null,
    });
  } catch (error) {
    console.error("[AuthController] Erro ao atualizar perfil:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body || {};

    if (!senhaAtual || typeof senhaAtual !== "string") {
      return res.status(400).json({ message: "Informe a senha atual." });
    }
    if (!novaSenha || typeof novaSenha !== "string" || novaSenha.length < 8 || novaSenha.length > 72) {
      return res.status(400).json({ message: "A nova senha deve ter entre 8 e 72 caracteres." });
    }

    const db = getDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.session.userId) });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const senhaConfere = await bcrypt.compare(senhaAtual, user.password);
    if (!senhaConfere) {
      return res.status(400).json({ message: "Senha atual incorreta." });
    }

    if (novaSenha === senhaAtual) {
      return res.status(400).json({ message: "A nova senha deve ser diferente da senha atual." });
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 12);
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    res.json({ message: "Senha alterada com sucesso." });
  } catch (error) {
    console.error("[AuthController] Erro ao alterar senha:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Nenhuma imagem enviada." });
    }

    const tipoReal = detectarTipoImagem(req.file.buffer);
    if (!tipoReal) {
      return res.status(400).json({ message: "Arquivo inválido. Envie uma imagem JPEG, PNG ou WebP." });
    }

    const db = getDatabase();
    const userId = new ObjectId(req.session.userId);
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { fotoId: 1 } });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
    const novoFileId = await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(`perfil-${userId}`, {
        contentType: tipoReal,
        metadata: { userId },
      });
      uploadStream.on("error", reject);
      uploadStream.on("finish", () => resolve(uploadStream.id));
      uploadStream.end(req.file.buffer);
    });

    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { fotoId: novoFileId } }
    );

    if (user.fotoId) {
      try {
        const anteriorId = user.fotoId instanceof ObjectId ? user.fotoId : new ObjectId(user.fotoId);
        await bucket.delete(anteriorId);
      } catch {
        // Ignora caso a foto anterior já não exista
      }
    }

    res.json({ message: "Foto de perfil atualizada com sucesso.", temFoto: true });
  } catch (error) {
    console.error("[AuthController] Erro ao salvar foto de perfil:", error);
    res.status(500).json({ message: "Erro interno ao salvar foto de perfil." });
  }
};

export const getProfilePhoto = async (req, res) => {
  try {
    const db = getDatabase();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.session.userId) },
      { projection: { fotoId: 1 } }
    );

    if (!user || !user.fotoId) {
      return res.status(404).json({ message: "Foto de perfil não encontrada." });
    }

    const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
    const fotoId = user.fotoId instanceof ObjectId ? user.fotoId : new ObjectId(user.fotoId);

    const files = await bucket.find({ _id: fotoId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ message: "Foto de perfil não encontrada." });
    }

    res.setHeader("Content-Type", files[0].contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, no-cache");

    const downloadStream = bucket.openDownloadStream(fotoId);
    downloadStream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({ message: "Erro ao ler foto de perfil." });
      }
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error("[AuthController] Erro ao carregar foto de perfil:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno ao carregar foto." });
    }
  }
};

export const deleteProfilePhoto = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = new ObjectId(req.session.userId);
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { fotoId: 1 } });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (user.fotoId) {
      const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
      try {
        const fotoId = user.fotoId instanceof ObjectId ? user.fotoId : new ObjectId(user.fotoId);
        await bucket.delete(fotoId);
      } catch {
        // Ignora caso já tenha sido removida
      }
      await db.collection("users").updateOne({ _id: userId }, { $unset: { fotoId: "" } });
    }

    res.json({ message: "Foto de perfil removida com sucesso.", temFoto: false });
  } catch (error) {
    console.error("[AuthController] Erro ao remover foto de perfil:", error);
    res.status(500).json({ message: "Erro interno ao remover foto." });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { senha } = req.body || {};
    if (!senha || typeof senha !== "string") {
      return res.status(400).json({ message: "Informe sua senha para confirmar a exclusão." });
    }

    const db = getDatabase();
    const userId = new ObjectId(req.session.userId);
    const user = await db.collection("users").findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const senhaConfere = await bcrypt.compare(senha, user.password);
    if (!senhaConfere) {
      return res.status(400).json({ message: "Senha incorreta." });
    }

    const pets = await db
      .collection("pets")
      .find({ donoId: userId }, { projection: { _id: 1 } })
      .toArray();

    await excluirDadosDosPets(db, pets.map((p) => p._id));

    if (user.fotoId) {
      const bucket = new GridFSBucket(db, { bucketName: PHOTO_BUCKET });
      try {
        const fotoId = user.fotoId instanceof ObjectId ? user.fotoId : new ObjectId(user.fotoId);
        await bucket.delete(fotoId);
      } catch {
        // Ignora caso já tenha sido removida
      }
    }

    await db.collection("users").deleteOne({ _id: userId });

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Conta removida, mas houve erro ao encerrar a sessão." });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Conta excluída com sucesso." });
    });
  } catch (error) {
    console.error("[AuthController] Erro ao excluir conta:", error);
    res.status(500).json({ message: "Erro interno ao excluir conta." });
  }
};
