import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

export const cadastrarPet = async (req, res) => {
  try {
    const donoId = req.session.userId;
    // A validação de donoId !donoId foi removida daqui porque o middleware requireAuth já faz isso

    let { nome, especie, raca, dataNascimento, peso } = req.body;

    // Validação de Input Padrão Enterprise
    if (!nome || typeof nome !== "string" || nome.trim().length < 1 || nome.trim().length > 50) {
      return res.status(400).json({ message: "Nome do pet inválido ou excede 50 caracteres." });
    }
    if (!especie || typeof especie !== "string") {
      return res.status(400).json({ message: "Espécie do pet é obrigatória." });
    }
    if (!dataNascimento || typeof dataNascimento !== "string") {
      return res.status(400).json({ message: "Data de nascimento inválida." });
    }

    const pesoNum = Number(peso);
    if (isNaN(pesoNum) || pesoNum <= 0) {
      return res.status(400).json({ message: "Peso deve ser um valor numérico positivo." });
    }

    const db = getDatabase();

    const novoPet = {
      nome: nome.trim(),
      especie: especie.trim(),
      raca: raca ? raca.trim() : null, // Raça é opcional
      dataNascimento, // Recomendado manter formato YYYY-MM-DD
      peso: pesoNum,
      donoId: new ObjectId(donoId),
      criadoEm: new Date()
    };

    const result = await db.collection("pets").insertOne(novoPet);

    // Resposta padronizada sem mensagens informais de debug
    res.status(201).json({
      message: "Pet cadastrado com sucesso.",
      petId: result.insertedId
    });

  } catch (error) {
    console.error("[PetController] Erro ao cadastrar pet:", error);
    res.status(500).json({ message: "Erro interno do servidor ao processar o cadastro." });
  }
};