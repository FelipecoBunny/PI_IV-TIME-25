/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { MongoClient } from "mongodb";

let client;
let database;

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("pets").createIndex({ donoId: 1 }),
    db.collection("vaccines").createIndex({ petId: 1 }),
    db.collection("consultations").createIndex({ petId: 1, data: -1 }),
    db.collection("medications").createIndex({ petId: 1, status: 1 }),
    db.collection("medicationLogs").createIndex({ petId: 1, data: 1 }),
    db.collection("medicationLogs").createIndex(
      { medicationId: 1, data: 1, horario: 1 },
      { unique: true }
    ),
  ]);
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("COLE_AQUI")) {
    throw new Error("Configure MONGODB_URI no arquivo backend/.env");
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db("pethealth");
  await database.command({ ping: 1 });
  try {
    await ensureIndexes(database);
  } catch (error) {
    console.warn("Aviso: não foi possível criar os índices:", error.message);
  }

  console.log("MongoDB conectado com sucesso.");
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("O banco de dados ainda não foi conectado.");
  }
  return database;
}