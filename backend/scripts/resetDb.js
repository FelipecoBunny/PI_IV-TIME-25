/*
* APENAS PARA AMBIENTE DE DESENVOLVIMENTO.
* node scripts/resetDb.js --confirmar
*/

import "dotenv/config";
import { MongoClient } from "mongodb";

if (process.env.NODE_ENV === "production") {
  console.error("ERRO: Este script não pode ser executado em produção.");
  process.exit(1);
}

if (!process.argv.includes("--confirmar")) {
  console.error("Operação abortada. Rode com: node scripts/resetDb.js --confirmar");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI não configurada.");

async function resetDatabase() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();

    await client.db("pethealth").dropDatabase();
    console.log('Banco "pethealth" apagado por completo (coleções, índices e GridFS).');

    const testDb = client.db("test");
    const testCols = await testDb.listCollections({ name: "sessions" }).toArray();
    if (testCols.length > 0) {
      await testDb.collection("sessions").drop();
      console.log('Coleção antiga "test.sessions" removida.');
    }

    console.log("\nPronto! Agora reinicie o servidor Node (npm start) para recriar os índices automaticamente.");
  } catch (error) {
    console.error("Erro ao limpar banco:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

resetDatabase();