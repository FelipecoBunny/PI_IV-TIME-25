/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

const TIME_ZONE = "America/Sao_Paulo";
const FORMATOS_VALIDOS = new Set(["Comprimido", "Cápsula", "Líquido", "Gotas", "Pomada", "Injeção"]);
const UNIDADES_VALIDAS = new Set(["mg", "ml", "g", "gotas", "comprimido", "cápsula", "unidade"]);
const STATUS_ALTERAVEIS = new Set(["ativo", "arquivado"]);
const MAX_HORARIOS = 6;
const ORDEM_STATUS = { ativo: 0, concluido: 1, arquivado: 2 };

function getHojeSP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function getDiaSemanaSP(dataISO) {
  const [y, m, d] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isDataRealISO(valor) {
  if (typeof valor !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!match) return false;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function isHorarioValido(valor) {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor.trim());
}

async function verificarDonoPet(db, petIdStr, userIdStr) {
  if (!ObjectId.isValid(petIdStr) || !ObjectId.isValid(userIdStr)) return null;
  return db.collection("pets").findOne({
    _id: new ObjectId(petIdStr),
    donoId: new ObjectId(userIdStr),
  });
}

function valeHoje(med, hoje, diaSemanaHoje) {
  if (med.status !== "ativo") return false;
  if (!med.dataInicio || med.dataInicio > hoje) return false;
  if (med.dataFim && med.dataFim < hoje) return false;
  return Array.isArray(med.diasDaSemana) && med.diasDaSemana.includes(diaSemanaHoje);
}

function formatarMedicamento(m) {
  return {
    _id: m._id,
    medicamento: m.medicamento,
    principioAtivo: m.principioAtivo || "",
    formato: m.formato,
    dosagem: m.dosagem ?? null,
    unidade: m.unidade || "",
    dose: m.dose || "",
    horarios: Array.isArray(m.horarios) ? m.horarios : [],
    diasDaSemana: Array.isArray(m.diasDaSemana) ? m.diasDaSemana : [],
    dataInicio: m.dataInicio || "",
    dataFim: m.dataFim ?? null,
    status: m.status,
    criadoEm: m.criadoEm || null,
    atualizadoEm: m.atualizadoEm || null,
  };
}

function validarPayloadMedicamento(body) {
  const {
    medicamento,
    principioAtivo,
    formato,
    dosagem,
    unidade,
    horarios,
    diasDaSemana,
    dataInicio,
    dataFim,
  } = body || {};

  if (!medicamento || typeof medicamento !== "string" || medicamento.trim().length < 1 || medicamento.trim().length > 100) {
    return { erro: "Informe o nome do medicamento (entre 1 e 100 caracteres)." };
  }

  let principioLimpo = "";
  if (principioAtivo !== undefined && principioAtivo !== null && String(principioAtivo).trim() !== "") {
    if (typeof principioAtivo !== "string" || principioAtivo.trim().length > 100) {
      return { erro: "O nome da droga/sal deve ter no máximo 100 caracteres." };
    }
    principioLimpo = principioAtivo.trim();
  }

  if (!formato || typeof formato !== "string" || !FORMATOS_VALIDOS.has(formato.trim())) {
    return { erro: "Selecione um formato válido." };
  }

  if (
    dosagem === undefined ||
    dosagem === null ||
    typeof dosagem === "boolean" ||
    String(dosagem).trim() === ""
  ) {
    return { erro: "Informe a dosagem." };
  }
  const dosagemNum = Number(dosagem);
  if (!Number.isFinite(dosagemNum) || dosagemNum <= 0) {
    return { erro: "A dosagem deve ser um número maior que zero." };
  }

  if (!unidade || typeof unidade !== "string" || !UNIDADES_VALIDAS.has(unidade.trim())) {
    return { erro: "Selecione uma unidade válida." };
  }

  if (!Array.isArray(diasDaSemana) || diasDaSemana.length === 0) {
    return { erro: "Selecione pelo menos um dia da semana." };
  }
  const diasUnicos = new Set();
  for (const dia of diasDaSemana) {
    const num = Number(dia);
    if (typeof dia === "boolean" || !Number.isInteger(num) || num < 0 || num > 6) {
      return { erro: "Dias da semana inválidos (use valores de 0 a 6)." };
    }
    diasUnicos.add(num);
  }
  const diasOrdenados = Array.from(diasUnicos).sort((a, b) => a - b);

  let horariosLista = [];
  if (horarios !== undefined && horarios !== null) {
    if (!Array.isArray(horarios)) {
      return { erro: "Horários devem ser enviados como lista." };
    }
    if (horarios.length > MAX_HORARIOS) {
      return { erro: `Informe no máximo ${MAX_HORARIOS} horários.` };
    }
    const horariosSet = new Set();
    for (const h of horarios) {
      if (!isHorarioValido(h)) {
        return { erro: "Informe horários válidos no formato HH:MM." };
      }
      const limpo = h.trim();
      if (horariosSet.has(limpo)) {
        return { erro: "Não repita horários iguais." };
      }
      horariosSet.add(limpo);
    }
    horariosLista = Array.from(horariosSet).sort((a, b) => a.localeCompare(b));
  }

  if (!isDataRealISO(dataInicio)) {
    return { erro: "Informe uma data de início válida (AAAA-MM-DD)." };
  }
  const inicioLimpo = dataInicio.trim();

  let fimLimpo = null;
  if (dataFim !== undefined && dataFim !== null && String(dataFim).trim() !== "") {
    if (!isDataRealISO(dataFim)) {
      return { erro: "Data de fim inválida (AAAA-MM-DD)." };
    }
    fimLimpo = dataFim.trim();
    if (fimLimpo < inicioLimpo) {
      return { erro: "A data de fim não pode ser anterior à data de início." };
    }
  }

  const unidadeLimpa = unidade.trim();
  const dados = {
    medicamento: medicamento.trim(),
    formato: formato.trim(),
    dosagem: dosagemNum,
    unidade: unidadeLimpa,
    dose: `${dosagemNum} ${unidadeLimpa}`,
    horarios: horariosLista,
    diasDaSemana: diasOrdenados,
    dataInicio: inicioLimpo,
    dataFim: fimLimpo,
  };

  if (principioLimpo) {
    dados.principioAtivo = principioLimpo;
  }

  return { dados };
}

export const listarMedicamentos = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const hoje = getHojeSP();
    const diaSemanaHoje = getDiaSemanaSP(hoje);

    // Conclui automaticamente medicamentos ativos cuja dataFim já passou
    await db.collection("medications").updateMany(
      {
        petId: pet._id,
        status: "ativo",
        dataFim: { $type: "string", $ne: "", $lt: hoje },
      },
      { $set: { status: "concluido", atualizadoEm: new Date() } }
    );

    const [todos, logsHoje] = await Promise.all([
      db.collection("medications").find({ petId: pet._id }).toArray(),
      db.collection("medicationLogs").find({ petId: pet._id, data: hoje }).toArray(),
    ]);

    const logsMap = new Map();
    for (const log of logsHoje) {
      const chave = `${String(log.medicationId)}|${log.horario || ""}`;
      logsMap.set(chave, log);
    }

    const dosesHoje = [];
    for (const med of todos) {
      if (!valeHoje(med, hoje, diaSemanaHoje)) continue;

      const listaHorarios =
        Array.isArray(med.horarios) && med.horarios.length > 0 ? med.horarios : [""];

      for (const horario of listaHorarios) {
        const log = logsMap.get(`${String(med._id)}|${horario}`);
        dosesHoje.push({
          medicamentoId: med._id,
          nome: med.medicamento,
          horario,
          dose: med.dose || "",
          tomado: Boolean(log),
          doseRegistrada: log?.doseRegistrada || "",
        });
      }
    }

    dosesHoje.sort((a, b) => {
      if (!a.horario && !b.horario) return a.nome.localeCompare(b.nome, "pt-BR");
      if (!a.horario) return 1;
      if (!b.horario) return -1;
      const cmpHora = a.horario.localeCompare(b.horario);
      return cmpHora !== 0 ? cmpHora : a.nome.localeCompare(b.nome, "pt-BR");
    });

    const medicamentos = todos
      .sort((a, b) => {
        const ordA = ORDEM_STATUS[a.status] ?? 9;
        const ordB = ORDEM_STATUS[b.status] ?? 9;
        if (ordA !== ordB) return ordA - ordB;
        return String(a.medicamento || "").localeCompare(String(b.medicamento || ""), "pt-BR");
      })
      .map(formatarMedicamento);

    res.json({
      pet: { nome: pet.nome },
      hoje,
      dosesHoje,
      medicamentos,
    });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao listar medicamentos:", error);
    res.status(500).json({ message: "Erro interno ao buscar medicamentos." });
  }
};

export const criarMedicamento = async (req, res) => {
  try {
    const db = getDatabase();
    const pet = await verificarDonoPet(db, req.params.petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const { erro, dados } = validarPayloadMedicamento(req.body);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const hoje = getHojeSP();
    const status = dados.dataFim === null || dados.dataFim >= hoje ? "ativo" : "concluido";

    const novoMedicamento = {
      petId: pet._id,
      ...dados,
      status,
      criadoEm: new Date(),
    };

    const result = await db.collection("medications").insertOne(novoMedicamento);

    res.status(201).json({
      message: "Medicamento registrado com sucesso.",
      medicamentoId: result.insertedId,
      medicamento: formatarMedicamento({ _id: result.insertedId, ...novoMedicamento }),
    });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao criar medicamento:", error);
    res.status(500).json({ message: "Erro interno ao salvar medicamento." });
  }
};

export const atualizarMedicamento = async (req, res) => {
  try {
    const { petId, medicamentoId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(medicamentoId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const existente = await db.collection("medications").findOne({
      _id: new ObjectId(medicamentoId),
      petId: pet._id,
    });
    if (!existente) {
      return res.status(404).json({ message: "Medicamento não encontrado." });
    }

    const { erro, dados } = validarPayloadMedicamento(req.body);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const hoje = getHojeSP();
    const status =
      existente.status === "arquivado"
        ? "arquivado"
        : dados.dataFim === null || dados.dataFim >= hoje
          ? "ativo"
          : "concluido";

    const $set = {
      ...dados,
      status,
      atualizadoEm: new Date(),
    };
    const $unset = {};
    if (!("principioAtivo" in dados)) {
      $unset.principioAtivo = "";
    }

    const updateOp = Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
    const atualizado = await db.collection("medications").findOneAndUpdate(
      { _id: existente._id },
      updateOp,
      { returnDocument: "after" }
    );

    res.json({
      message: "Medicamento atualizado com sucesso.",
      medicamento: formatarMedicamento(atualizado),
    });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao atualizar medicamento:", error);
    res.status(500).json({ message: "Erro interno ao atualizar medicamento." });
  }
};

export const alterarStatusMedicamento = async (req, res) => {
  try {
    const { petId, medicamentoId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(medicamentoId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const { status } = req.body || {};
    if (typeof status !== "string" || !STATUS_ALTERAVEIS.has(status)) {
      return res.status(400).json({ message: "Status inválido. Use ativo ou arquivado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const med = await db.collection("medications").findOne({
      _id: new ObjectId(medicamentoId),
      petId: pet._id,
    });
    if (!med) {
      return res.status(404).json({ message: "Medicamento não encontrado." });
    }

    const hoje = getHojeSP();
    if (status === "ativo" && med.dataFim && med.dataFim < hoje) {
      return res.status(400).json({
        message: "A data de fim deste medicamento já passou. Ajuste as datas antes de desarquivar.",
      });
    }

    await db.collection("medications").updateOne(
      { _id: med._id },
      { $set: { status, atualizadoEm: new Date() } }
    );

    res.json({
      message: status === "arquivado" ? "Medicamento arquivado." : "Medicamento reativado.",
      status,
    });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao alterar status:", error);
    res.status(500).json({ message: "Erro interno ao alterar status do medicamento." });
  }
};

export const excluirMedicamento = async (req, res) => {
  try {
    const { petId, medicamentoId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(medicamentoId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const med = await db.collection("medications").findOne({
      _id: new ObjectId(medicamentoId),
      petId: pet._id,
    });
    if (!med) {
      return res.status(404).json({ message: "Medicamento não encontrado." });
    }

    await Promise.all([
      db.collection("medicationLogs").deleteMany({ petId: pet._id, medicationId: med._id }),
      db.collection("medications").deleteOne({ _id: med._id }),
    ]);

    res.json({ message: "Medicamento excluído com sucesso." });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao excluir medicamento:", error);
    res.status(500).json({ message: "Erro interno ao excluir medicamento." });
  }
};

export const registrarDose = async (req, res) => {
  try {
    const { petId, medicamentoId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(medicamentoId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const med = await db.collection("medications").findOne({
      _id: new ObjectId(medicamentoId),
      petId: pet._id,
    });
    if (!med) {
      return res.status(404).json({ message: "Medicamento não encontrado." });
    }

    const hoje = getHojeSP();
    const diaSemanaHoje = getDiaSemanaSP(hoje);
    if (!valeHoje(med, hoje, diaSemanaHoje)) {
      return res.status(400).json({ message: "Este medicamento não está previsto para hoje." });
    }

    const { horario, doseEspecifica } = req.body || {};
    const horarioNorm = horario === undefined || horario === null ? "" : String(horario).trim();
    const horariosMed = Array.isArray(med.horarios) ? med.horarios : [];

    if (horariosMed.length === 0) {
      if (horarioNorm !== "") {
        return res.status(400).json({ message: "Este medicamento não possui horário definido." });
      }
    } else if (!horariosMed.includes(horarioNorm)) {
      return res.status(400).json({ message: "Horário inválido para este medicamento." });
    }

    let doseRegistrada = "";
    if (doseEspecifica !== undefined && doseEspecifica !== null && String(doseEspecifica).trim() !== "") {
      if (typeof doseEspecifica !== "string" || doseEspecifica.trim().length > 100) {
        return res.status(400).json({ message: "A dose específica deve ter no máximo 100 caracteres." });
      }
      doseRegistrada = doseEspecifica.trim();
    }

    const filtro = {
      petId: pet._id,
      medicationId: med._id,
      data: hoje,
      horario: horarioNorm,
    };

    const docInsert = {
      ...filtro,
      tomadoEm: new Date(),
    };
    if (doseRegistrada) {
      docInsert.doseRegistrada = doseRegistrada;
    }

    const resultado = await db.collection("medicationLogs").updateOne(
      filtro,
      { $setOnInsert: docInsert },
      { upsert: true }
    );

    const statusHttp = resultado.upsertedCount > 0 ? 201 : 200;
    res.status(statusHttp).json({
      message: "Dose registrada como tomada.",
      tomado: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        message: "Dose registrada como tomada.",
        tomado: true,
      });
    }
    console.error("[MedicamentoController] Erro ao registrar dose:", error);
    res.status(500).json({ message: "Erro interno ao registrar dose." });
  }
};

export const desfazerDose = async (req, res) => {
  try {
    const { petId, medicamentoId } = req.params;
    if (!ObjectId.isValid(petId) || !ObjectId.isValid(medicamentoId)) {
      return res.status(404).json({ message: "Recurso não encontrado." });
    }

    const db = getDatabase();
    const pet = await verificarDonoPet(db, petId, req.session.userId);
    if (!pet) {
      return res.status(404).json({ message: "Pet não encontrado." });
    }

    const med = await db.collection("medications").findOne({
      _id: new ObjectId(medicamentoId),
      petId: pet._id,
    });
    if (!med) {
      return res.status(404).json({ message: "Medicamento não encontrado." });
    }

    const horario = typeof req.query.horario === "string" ? req.query.horario.trim() : "";
    if (horario !== "" && !isHorarioValido(horario)) {
      return res.status(400).json({ message: "Horário inválido." });
    }

    const hoje = getHojeSP();
    await db.collection("medicationLogs").deleteOne({
      petId: pet._id,
      medicationId: med._id,
      data: hoje,
      horario,
    });

    res.json({ message: "Registro de dose removido.", tomado: false });
  } catch (error) {
    console.error("[MedicamentoController] Erro ao desfazer dose:", error);
    res.status(500).json({ message: "Erro interno ao desfazer registro da dose." });
  }
};