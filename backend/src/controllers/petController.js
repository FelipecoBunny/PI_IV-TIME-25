/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { calcularPainel } from '../services/dashboardService.js';

export const cadastrarPet = async (req, res) => {
  try {
    const donoId = req.session.userId;

    let { nome, especie, raca, dataNascimento, peso } = req.body;

    // Validação
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
      raca: raca ? raca.trim() : null, // Opcional
      dataNascimento,
      peso: pesoNum,
      donoId: new ObjectId(donoId),
      criadoEm: new Date()
    };

    const result = await db.collection("pets").insertOne(novoPet);

    // Retorna o ID do novo pet
    res.status(201).json({
      message: "Pet cadastrado com sucesso.",
      petId: result.insertedId
    });

  } catch (error) {
    console.error("[PetController] Erro ao cadastrar pet:", error);
    res.status(500).json({ message: "Erro interno do servidor ao processar o cadastro." });
  }
};

export const listarPets = async (req, res) => {
  try {
    const db = getDatabase();
    const pets = await db.collection("pets")
      .find({ donoId: new ObjectId(req.session.userId) })
      .project({ nome: 1, especie: 1 })
      .toArray();

    res.json(pets);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar pets." });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const db = getDatabase();
    const ownerId = new ObjectId(req.session.userId);
    const petId = new ObjectId(req.params.petId);

    // Valida dono
    const pet = await db.collection("pets").findOne({ _id: petId, donoId: ownerId });
    if (!pet) return res.status(404).json({ message: "Pet não encontrado." });

    // Busca dados do dashboard
    const [vaccines, medications, consultations, medicationLogs] = await Promise.all([
      db.collection("vaccines").find({ petId }).toArray(),
      db.collection("medications").find({ petId }).toArray(),
      db.collection("consultations").find({ petId }).toArray(),
      db.collection("medicationLogs").find({ petId }).toArray()
    ]);

    // Calcula a data de hoje (Fuso de SP - Mudar depois para o fuso do usuário se necessário)
    const dataSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hojeStr = dataSP.toISOString().split('T')[0];

    const painel = calcularPainel({ pet, vaccines, medications, medicationLogs, consultations, hojeStr });
    res.json(painel);

  } catch (error) {
    console.error("Erro no dashboard:", error);
    res.status(500).json({ message: "Erro ao gerar dashboard." });
  }
};