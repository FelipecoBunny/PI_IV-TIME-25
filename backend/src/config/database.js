import { MongoClient } from "mongodb";

let client;
let database;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("COLE_AQUI")) {
    throw new Error("Configure MONGODB_URI no arquivo backend/.env");
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db("pethealth");
  await database.command({ ping: 1 });
  await database.collection("users").createIndex({ email: 1 }, { unique: true });

  console.log("MongoDB conectado com sucesso.");
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("O banco de dados ainda não foi conectado.");
  }
  return database;
}