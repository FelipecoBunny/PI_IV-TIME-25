/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const TIME_ZONE = "America/Sao_Paulo";
const ESPECIES_VALIDAS = new Set(["cachorro", "gato", "outro"]);
const SEXOS_VALIDOS = new Set(["femea", "macho"]);

function getHojeSP() {
  // O locale en-CA formata a data local diretamente como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
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

function parseNumeroOpcional(valor, { minExclusivo, max, nomeCampo }) {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    return { ausente: true };
  }
  if (typeof valor === "boolean") {
    return { erro: `${nomeCampo} inválido.` };
  }
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= minExclusivo || num > max) {
    return { erro: `${nomeCampo} deve ser maior que ${minExclusivo} e até ${max}.` };
  }
  return { valor: num };
}

export function validarPet(body) {
  const {
    nome,
    especie,
    raca,
    dataNascimento,
    peso,
    sexo,
    comprimentoCm,
    alturaCm,
  } = body || {};

  if (!nome || typeof nome !== "string" || nome.trim().length < 1 || nome.trim().length > 50) {
    return { erro: "Nome do pet deve ter entre 1 e 50 caracteres." };
  }

  if (!especie || typeof especie !== "string") {
    return { erro: "Espécie do pet é obrigatória." };
  }
  const especieNorm = especie.trim().toLowerCase();
  if (!ESPECIES_VALIDAS.has(especieNorm)) {
    return { erro: "Espécie inválida. Use cachorro, gato ou outro." };
  }

  let racaLimpa = null;
  if (raca !== undefined && raca !== null && String(raca).trim() !== "") {
    if (typeof raca !== "string" || raca.trim().length > 50) {
      return { erro: "Raça deve ter no máximo 50 caracteres." };
    }
    racaLimpa = raca.trim();
  }

  if (!isDataRealISO(dataNascimento)) {
    return { erro: "Data de nascimento inválida. Use o formato AAAA-MM-DD." };
  }
  const dataLimpa = dataNascimento.trim();
  if (dataLimpa > getHojeSP()) {
    return { erro: "A data de nascimento não pode estar no futuro." };
  }

  if (
    peso === undefined ||
    peso === null ||
    typeof peso === "boolean" ||
    String(peso).trim() === ""
  ) {
    return { erro: "Informe o peso do pet." };
  }
  const pesoNum = Number(peso);
  if (!Number.isFinite(pesoNum) || pesoNum <= 0 || pesoNum > 200) {
    return { erro: "Peso deve ser maior que 0 e até 200 kg." };
  }

  const dados = {
    nome: nome.trim(),
    especie: especieNorm,
    raca: racaLimpa,
    dataNascimento: dataLimpa,
    peso: pesoNum,
  };

  if (sexo !== undefined && sexo !== null && String(sexo).trim() !== "") {
    if (typeof sexo !== "string") {
      return { erro: "Sexo inválido. Use femea ou macho." };
    }
    const sexoNorm = sexo.trim().toLowerCase();
    if (!SEXOS_VALIDOS.has(sexoNorm)) {
      return { erro: "Sexo inválido. Use femea ou macho." };
    }
    dados.sexo = sexoNorm;
  }

  const comp = parseNumeroOpcional(comprimentoCm, {
    minExclusivo: 0,
    max: 300,
    nomeCampo: "Comprimento",
  });
  if (comp.erro) return { erro: comp.erro };
  if (!comp.ausente) dados.comprimentoCm = comp.valor;

  const alt = parseNumeroOpcional(alturaCm, {
    minExclusivo: 0,
    max: 300,
    nomeCampo: "Altura",
  });
  if (alt.erro) return { erro: alt.erro };
  if (!alt.ausente) dados.alturaCm = alt.valor;

  return { dados };
}