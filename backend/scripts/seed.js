/*
* Seed gerada por IA.
* APENAS PARA PSEUDO-DADOS DE TESTE.
*/

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { GridFSBucket, MongoClient } from 'mongodb';

if (process.env.NODE_ENV === 'production') {
  console.error("ERRO: O Seed não pode ser executado em ambiente de produção.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI não configurada.");

const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
function getDateOffset(dias) {
  const [a, m, d] = hojeSP.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

async function runSeed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('pethealth');
    console.log("Conectado ao MongoDB para Seed.");

    const TEST_EMAIL = 'teste@pethealth.com';

    // 1. Limpeza segura pelos petIds do usuário de teste (incluindo arquivos no GridFS)
    const existingUser = await db.collection('users').findOne({ email: TEST_EMAIL });
    if (existingUser) {
      const ownerId = existingUser._id;
      const userPets = await db.collection('pets').find({ donoId: ownerId }).toArray();
      const petIds = userPets.map((p) => p._id);

      if (petIds.length > 0) {
        const consultasAntigas = await db
          .collection('consultations')
          .find({ petId: { $in: petIds } })
          .toArray();

        const consultaBucket = new GridFSBucket(db, { bucketName: 'consultaDocumentos' });
        for (const consulta of consultasAntigas) {
          for (const doc of consulta.documentos || []) {
            if (doc.fileId) {
              try {
                await consultaBucket.delete(doc.fileId);
              } catch {
                // Ignora caso o arquivo já não exista no bucket
              }
            }
          }
        }

        const vacinasAntigas = await db
          .collection('vaccines')
          .find({ petId: { $in: petIds } })
          .toArray();

        const vacinaBucket = new GridFSBucket(db, { bucketName: 'vacinaDocumentos' });
        for (const vacina of vacinasAntigas) {
          for (const doc of vacina.documentos || []) {
            if (doc.fileId) {
              try {
                await vacinaBucket.delete(doc.fileId);
              } catch {
                // Ignora caso o arquivo já não exista no bucket
              }
            }
          }
        }

        const fotosPetsBucket = new GridFSBucket(db, { bucketName: 'fotosPets' });
        for (const pet of userPets) {
          if (pet.fotoId) {
            try {
              await fotosPetsBucket.delete(pet.fotoId);
            } catch {
              // Ignora caso a foto já não exista no bucket
            }
          }
        }

        await db.collection('vaccines').deleteMany({ petId: { $in: petIds } });
        await db.collection('medications').deleteMany({ petId: { $in: petIds } });
        await db.collection('consultations').deleteMany({ petId: { $in: petIds } });
        await db.collection('medicationLogs').deleteMany({ petId: { $in: petIds } });
        await db.collection('exams').deleteMany({ petId: { $in: petIds } });
      }

      if (existingUser.fotoId) {
        const fotosPerfilBucket = new GridFSBucket(db, { bucketName: 'fotosPerfil' });
        try {
          await fotosPerfilBucket.delete(existingUser.fotoId);
        } catch {
          // Ignora caso a foto já não exista no bucket
        }
      }

      await db.collection('pets').deleteMany({ donoId: ownerId });
      await db.collection('users').deleteOne({ _id: ownerId });
      console.log("Dados do usuário de teste anterior removidos.");
    }

    // 2. Criação do Usuário
    const hashedPassword = await bcrypt.hash('senha123', 12);
    const userRes = await db.collection('users').insertOne({
      name: 'Testador Silva',
      email: TEST_EMAIL,
      password: hashedPassword,
      criadoEm: new Date()
    });
    const ownerId = userRes.insertedId;

    // 3. Criação dos Pets
    const pet1 = {
      donoId: ownerId,
      nome: 'Luna',
      especie: 'cachorro',
      raca: 'SRD',
      dataNascimento: '2020-05-10',
      peso: 15.2,
      sexo: 'femea',
      comprimentoCm: 65,
      alturaCm: 48,
      criadoEm: new Date()
    };
    const pet2 = {
      donoId: ownerId,
      nome: 'Garfield',
      especie: 'gato',
      raca: 'Persa',
      dataNascimento: '2022-01-15',
      peso: 5.5,
      sexo: 'macho',
      comprimentoCm: 46,
      alturaCm: 28,
      criadoEm: new Date()
    };

    const petRes = await db.collection('pets').insertMany([pet1, pet2]);
    const petLunaId = petRes.insertedIds[0];
    const agora = new Date();

    // 4. Vacinas (Luna)
    const vacinasRes = await db.collection('vaccines').insertMany([
      {
        petId: petLunaId,
        ownerId,
        titulo: 'V10',
        dose: '2ª dose',
        status: 'pendente',
        proximaDose: getDateOffset(-3),
        local: 'Clínica VetVida — Av. Brasil, 1420',
        veterinario: 'Dra. Camila Nogueira',
        observacoes: 'Levar carteirinha física.',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        titulo: 'Antirrábica',
        dose: 'Reforço',
        status: 'pendente',
        proximaDose: getDateOffset(5),
        local: 'Hospital Veterinário Cambuí — R. Coronel Quirino, 890',
        veterinario: 'Dr. Rafael Mendes',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        titulo: 'Gripe canina',
        dose: 'Dose única',
        status: 'pendente',
        proximaDose: getDateOffset(30),
        local: 'Clínica PetCare — Av. Norte-Sul, 510',
        veterinario: 'Dra. Beatriz Almeida',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        titulo: 'V10',
        dose: '1ª dose',
        status: 'aplicada',
        dataAplicacao: getDateOffset(-35),
        proximaDose: getDateOffset(-3),
        lote: 'VT26A1',
        fabricante: 'Zoetis',
        local: 'Clínica VetVida — Av. Brasil, 1420',
        veterinario: 'Dra. Camila Nogueira',
        observacoes: 'Sem reações adversas.',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        titulo: 'Antirrábica',
        dose: 'Dose única',
        status: 'aplicada',
        dataAplicacao: '2025-11-20',
        lote: 'AR2509',
        fabricante: 'Boehringer Ingelheim',
        local: 'Hospital Veterinário Cambuí — R. Coronel Quirino, 890',
        veterinario: 'Dr. Rafael Mendes',
        documentos: [],
        criadoEm: agora
      }
    ]);

    // 5. Medicamentos (Luna)
    const medicamentosRes = await db.collection('medications').insertMany([
      {
        petId: petLunaId,
        ownerId,
        medicamento: 'Amoxicilina',
        principioAtivo: 'Amoxicilina',
        formato: 'Comprimido',
        dosagem: 1,
        unidade: 'comprimido',
        dose: '1 comprimido',
        horarios: ['08:00', '20:00'],
        diasDaSemana: [0, 1, 2, 3, 4, 5, 6],
        dataInicio: getDateOffset(-5),
        dataFim: null,
        status: 'ativo',
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        medicamento: 'Dipirona',
        principioAtivo: 'Dipirona sódica',
        formato: 'Gotas',
        dosagem: 10,
        unidade: 'gotas',
        dose: '10 gotas',
        horarios: ['12:00'],
        diasDaSemana: [0, 1, 2, 3, 4, 5, 6],
        dataInicio: getDateOffset(-20),
        dataFim: getDateOffset(-10),
        status: 'concluido',
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        medicamento: 'Suplemento articular',
        formato: 'Cápsula',
        dosagem: 1,
        unidade: 'cápsula',
        dose: '1 cápsula',
        horarios: ['18:00'],
        diasDaSemana: [1, 3, 5],
        dataInicio: getDateOffset(-30),
        dataFim: null,
        status: 'ativo',
        criadoEm: agora
      },
      {
        petId: petLunaId,
        ownerId,
        medicamento: 'Colírio',
        formato: 'Gotas',
        dosagem: 2,
        unidade: 'gotas',
        dose: '2 gotas',
        horarios: ['12:00'],
        diasDaSemana: [0, 1, 2, 3, 4, 5, 6],
        dataInicio: getDateOffset(-100),
        dataFim: getDateOffset(-90),
        status: 'arquivado',
        criadoEm: agora
      }
    ]);

    // Log de dose tomada hoje (Amoxicilina 08:00)
    await db.collection('medicationLogs').insertOne({
      petId: petLunaId,
      medicationId: medicamentosRes.insertedIds[0],
      data: hojeSP,
      horario: '08:00',
      tomadoEm: agora
    });

    // 6. Consultas (Luna)
    const consultasRes = await db.collection('consultations').insertMany([
      {
        petId: petLunaId,
        motivo: 'Check-up anual',
        data: getDateOffset(-12),
        horario: '10:00',
        local: 'Clínica VetVida — Av. Brasil, 1420',
        veterinario: 'Dra. Camila Nogueira',
        status: 'realizada',
        diagnostico: 'Saudável',
        observacoes: 'Peso estável. Retorno em 12 meses.',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Dor de ouvido',
        data: getDateOffset(-35),
        horario: '14:30',
        local: 'Hospital Veterinário Cambuí — R. Coronel Quirino, 890',
        veterinario: 'Dr. Rafael Mendes',
        status: 'realizada',
        diagnostico: 'Otite leve',
        observacoes: 'Limpeza e pomada por 7 dias.',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Vômito e perda de apetite',
        data: getDateOffset(-60),
        horario: '11:15',
        local: 'Clínica PetCare — Av. Norte-Sul, 510',
        veterinario: 'Dra. Beatriz Almeida',
        status: 'realizada',
        diagnostico: 'Gastrite leve',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Controle de pulgas e carrapatos',
        data: getDateOffset(-95),
        horario: '16:00',
        local: 'Clínica VetVida — Av. Brasil, 1420',
        veterinario: 'Dr. Lucas Ferreira',
        status: 'realizada',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Avaliação de pele',
        data: getDateOffset(-130),
        horario: '09:30',
        local: 'Centro Veterinário Taquaral — Av. Heitor Penteado, 320',
        veterinario: 'Dra. Camila Nogueira',
        status: 'realizada',
        diagnostico: 'Dermatite alérgica',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Dor na pata esquerda',
        data: getDateOffset(0),
        horario: '16:00',
        local: 'Hospital Veterinário Cambuí — R. Coronel Quirino, 890',
        veterinario: 'Dr. Rafael Mendes',
        status: 'agendada',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Retorno do check-up',
        data: getDateOffset(4),
        horario: '09:00',
        local: 'Clínica VetVida — Av. Brasil, 1420',
        veterinario: 'Dra. Camila Nogueira',
        status: 'agendada',
        documentos: [],
        criadoEm: agora
      },
      {
        petId: petLunaId,
        motivo: 'Acompanhamento médico',
        data: getDateOffset(18),
        horario: '10:30',
        local: 'Clínica PetCare — Av. Norte-Sul, 510',
        veterinario: 'Dra. Beatriz Almeida',
        status: 'agendada',
        documentos: [],
        criadoEm: agora
      }
    ]);

    // 7. Índices de Otimização
    await db.collection('vaccines').createIndex({ petId: 1 });
    await db.collection('medications').createIndex({ ownerId: 1 });
    await db.collection('medications').createIndex({ petId: 1, status: 1 });
    await db.collection('medicationLogs').createIndex({ petId: 1, data: 1 });
    await db.collection('consultations').createIndex({ petId: 1, data: -1 });

    console.log(
      `\nSeed concluído!\n` +
      `- Usuário: ${TEST_EMAIL}\n` +
      `- Senha: senha123\n` +
      `- users: 1\n` +
      `- pets: ${petRes.insertedCount} (Luna com dados, Garfield vazio)\n` +
      `- vaccines: ${vacinasRes.insertedCount}\n` +
      `- medications: ${medicamentosRes.insertedCount}\n` +
      `- consultations: ${consultasRes.insertedCount}\n`
    );
  } catch (error) {
    console.error("Erro no seed:", error);
  } finally {
    await client.close();
  }
}

runSeed();