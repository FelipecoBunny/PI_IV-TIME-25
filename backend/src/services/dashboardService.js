/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

export function calcularPainel({ pet, vaccines, medications, medicationLogs, consultations, hojeStr }) {
  // Converte YYYY-MM-DD para Date
  const parseDate = (d) => new Date(`${d}T12:00:00Z`);
  const hoje = parseDate(hojeStr);
  const limite7Dias = new Date(hoje);
  limite7Dias.setDate(limite7Dias.getDate() + 7);

  const formatData = (d) => d.toISOString().split('T')[0];
  const limite7DiasStr = formatData(limite7Dias);

  const atrasados = [];
  const hojeLista = [];
  const proximos7Dias = [];
  const medicamentosHoje = [];

  // Vacinas
  vaccines.forEach(v => {
    if (v.status !== 'pendente' || !v.proximaDose) return;
    const doseData = v.proximaDose;

    if (doseData < hojeStr) {
      atrasados.push({ id: v._id, tipo: 'vacina', titulo: v.titulo, data: doseData });
    } else if (doseData > hojeStr && doseData <= limite7DiasStr) {
      proximos7Dias.push({ id: v._id, tipo: 'vacina', titulo: v.titulo, data: doseData });
    }
  });

  // Consultas
  let ultimaConsulta = null;
  consultations.forEach(c => {
    if (c.status === 'realizada' && c.data <= hojeStr) {
      if (!ultimaConsulta || c.data > ultimaConsulta) ultimaConsulta = c.data;
    }
    if (c.status === 'agendada') {
      if (c.data === hojeStr) {
        hojeLista.push({ id: c._id, tipo: 'consulta', titulo: c.motivo, registro: c.horario });
      } else if (c.data > hojeStr && c.data <= limite7DiasStr) {
        proximos7Dias.push({ id: c._id, tipo: 'consulta', titulo: c.motivo, data: c.data });
      }
    }
  });

  // Medicamentos de Hoje
  const diaSemanaHoje = hoje.getDay();
  medications.forEach(m => {
    if (m.status !== 'ativo') return;
    if (m.dataInicio > hojeStr) return; // Ainda não começou
    if (m.dataFim && m.dataFim < hojeStr) return; // Já terminou
    if (!m.diasDaSemana.includes(diaSemanaHoje)) return; // Não é hoje

    m.horarios.forEach(horario => {
      // Verifica se já foi tomado hoje
      const tomado = medicationLogs.some(log =>
        log.medicationId.toString() === m._id.toString() &&
        log.data === hojeStr &&
        log.horario === horario
      );
      medicamentosHoje.push({
        id: m._id,
        nome: m.medicamento,
        horario,
        dose: m.dose,
        tomado
      });
    });
  });

  // Ordenar
  atrasados.sort((a, b) => a.data.localeCompare(b.data));
  hojeLista.sort((a, b) => a.registro.localeCompare(b.registro));
  proximos7Dias.sort((a, b) => a.data.localeCompare(b.data));
  medicamentosHoje.sort((a, b) => a.horario.localeCompare(b.horario));

  let diasDesdeUltimaConsulta = null;
  if (ultimaConsulta) {
    const diffTime = Math.abs(hoje - parseDate(ultimaConsulta));
    diasDesdeUltimaConsulta = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    pet: { id: pet._id, nome: pet.nome, especie: pet.especie, raca: pet.raca },
    diasDesdeUltimaConsulta,
    medicamentosHoje,
    atrasados,
    hoje: hojeLista,
    proximos7Dias
  };
}