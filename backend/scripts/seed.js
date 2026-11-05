/*
* Seed gerada por IA.
* APENAS PARA PSEUDO-DADOS DE TESTE. NÃO USAR EM PRODUÇÃO.
*/

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId } from 'mongodb';

if (process.env.NODE_ENV === 'production') {
  console.error("ERRO: O Seed não pode ser executado em ambiente de produção.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI não configurada.");

// Helper para calcular datas relativas a hoje (Fuso SP)
function getDateOffset(days) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function runSeed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('pethealth');
    console.log("Conectado ao MongoDB para Seed.");

    const TEST_EMAIL = 'teste@pethealth.com';

    // 1. Limpeza segura (APENAS do usuário de teste)
    const existingUser = await db.collection('users').findOne({ email: TEST_EMAIL });
    if (existingUser) {
      const ownerId = existingUser._id;
      await db.collection('pets').deleteMany({ donoId: ownerId });
      await db.collection('vaccines').deleteMany({ ownerId });
      await db.collection('medications').deleteMany({ ownerId });
      await db.collection('consultations').deleteMany({ ownerId });
      await db.collection('medicationLogs').deleteMany({ ownerId });
      await db.collection('exams').deleteMany({ ownerId });
      await db.collection('users').deleteOne({ _id: ownerId });
      console.log("Dados do usuário de teste anterior removidos.");
    }

    // 2. Criação do Usuário
    const hashedPassword = await bcrypt.hash('senha123', 12);
    const userRes = await db.collection('users').insertOne({
      name: 'Testador Silva', email: TEST_EMAIL, password: hashedPassword
    });
    const ownerId = userRes.insertedId;

    // 3. Criação dos Pets
    const pet1 = { donoId: ownerId, nome: 'Luna', especie: 'Cachorro', raca: 'SRD', dataNascimento: '2020-05-10', peso: 15.2, criadoEm: new Date() };
    const pet2 = { donoId: ownerId, nome: 'Garfield', especie: 'Gato', raca: 'Persa', dataNascimento: '2022-01-15', peso: 5.5, criadoEm: new Date() };

    const petRes = await db.collection('pets').insertMany([pet1, pet2]);
    const petLunaId = petRes.insertedIds[0];
    const petGarfieldId = petRes.insertedIds[1]; // Garfield fica vazio para testar "Empty States"

    const hojeStr = getDateOffset(0);

    // 4. Vacinas (Luna)
    await db.collection('vaccines').insertMany([
      { petId: petLunaId, ownerId, titulo: 'V10 (Atrasada)', status: 'pendente', proximaDose: getDateOffset(-3) },
      { petId: petLunaId, ownerId, titulo: 'Antirrábica (Próxima)', status: 'pendente', proximaDose: getDateOffset(5) },
      { petId: petLunaId, ownerId, titulo: 'Gripe (Distante)', status: 'pendente', proximaDose: getDateOffset(30) },
      { petId: petLunaId, ownerId, titulo: 'V10 Dose 1', status: 'aplicada', dataAplicacao: '2025-01-10' }
    ]);

    // 5. Medicamentos (Luna)
    const medRes = await db.collection('medications').insertMany([
      { petId: petLunaId, ownerId, medicamento: 'Bravecto (Hoje)', formato: 'Comprimido', dose: '1 comp', horarios: ['08:00', '20:00'], diasDaSemana: [0, 1, 2, 3, 4, 5, 6], dataInicio: getDateOffset(-5), status: 'ativo' },
      { petId: petLunaId, ownerId, medicamento: 'Dipirona (Concluído)', formato: 'Gota', dose: '10 gotas', horarios: ['12:00'], diasDaSemana: [0, 1, 2, 3, 4, 5, 6], dataInicio: getDateOffset(-20), dataFim: getDateOffset(-10), status: 'concluido' }
    ]);

    // 6. Consultas (Luna)
    await db.collection('consultations').insertMany([
      { petId: petLunaId, ownerId, motivo: 'Revisão Orelha (Passada)', data: getDateOffset(-15), horario: '10:00', local: 'Clínica X', veterinario: 'Dra. Y', status: 'realizada' },
      { petId: petLunaId, ownerId, motivo: 'Checkup (Hoje)', data: hojeStr, horario: '16:00', local: 'Clínica X', veterinario: 'Dr. Z', status: 'agendada' },
      { petId: petLunaId, ownerId, motivo: 'Retorno (Próxima)', data: getDateOffset(4), horario: '09:00', local: 'Clínica X', veterinario: 'Dra. Y', status: 'agendada' }
    ]);

    // 7. Índices de Otimização
    await db.collection('vaccines').createIndex({ petId: 1 });
    await db.collection('medications').createIndex({ ownerId: 1 });

    console.log(`\nSeed concluído! \n- Usuário: ${TEST_EMAIL}\n- Senha: senha123\n- Pets criados: 2 (Luna com dados, Garfield vazio)\n`);
  } catch (error) {
    console.error("Erro no seed:", error);
  } finally {
    await client.close();
  }
}
runSeed();