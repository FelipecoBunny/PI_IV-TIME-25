import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

// Função auxiliar mantida internamente no controlador
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

    const newUser = { name, email, password: hashedPassword };

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

    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};