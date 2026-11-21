/*
* Autoria: Giovanni Joseppe Bozelli
* RA: 25006837
*/

const pawSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2" ry="2.8" /><ellipse cx="10" cy="5.8" rx="2" ry="2.8" /><ellipse cx="14" cy="5.8" rx="2" ry="2.8" /><ellipse cx="18" cy="10" rx="2" ry="2.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.4 0 1.6 1.3 2.6 2.9 2.6 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.6 0 2.9-1 2.9-2.6C17.5 14 15 11 12 11z" /></svg>`;

const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`;

const activeSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>`;

const doneSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="9 12 11 14 15 10" /></svg>`;

const archiveSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>`;

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FORMATOS_VALIDOS = new Set(['Comprimido', 'Cápsula', 'Líquido', 'Gotas', 'Pomada', 'Injeção']);
const UNIDADES_VALIDAS = new Set(['mg', 'ml', 'g', 'gotas', 'comprimido', 'cápsula', 'unidade']);
const MAX_HORARIOS = 6;

// Estados da tela
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const content = document.getElementById('medicamentos-content');
const retryBtn = document.getElementById('retry-btn');
const actionError = document.getElementById('action-error');

// Topo e seletor de pets
const petSubtitle = document.getElementById('pet-subtitle');
const addMedBtn = document.getElementById('add-med-btn');
const petSwitcherContainer = document.getElementById('pet-switcher-container');
const petListEl = document.getElementById('pet-list');

// Listas da página
const todayTitle = document.getElementById('today-title');
const todayList = document.getElementById('today-list');
const todayEmpty = document.getElementById('today-empty');
const planList = document.getElementById('plan-list');
const planEmpty = document.getElementById('plan-empty');
const savedList = document.getElementById('saved-list');
const savedEmpty = document.getElementById('saved-empty');

// Diálogo de cadastro/edição
const medDialog = document.getElementById('med-dialog');
const medDialogTitle = document.getElementById('med-dialog-title');
const medDialogSubtitle = document.getElementById('med-dialog-subtitle');
const medCloseBtn = document.getElementById('med-close');
const medCancelBtn = document.getElementById('med-cancel');
const medForm = document.getElementById('med-form');
const medError = document.getElementById('med-error');
const medSaveBtn = document.getElementById('med-save');
const medDeleteBtn = document.getElementById('med-delete');

const nomeInput = document.getElementById('med-nome');
const incluirSalCheckbox = document.getElementById('med-incluir-sal');
const salWrapper = document.getElementById('med-sal-wrapper');
const principioInput = document.getElementById('med-principio');
const formatoSelect = document.getElementById('med-formato');
const dosagemInput = document.getElementById('med-dosagem');
const unidadeSelect = document.getElementById('med-unidade');
const frequenciaSelect = document.getElementById('med-frequencia');
const daysGroup = document.getElementById('med-days-group');
const semHorarioCheckbox = document.getElementById('med-sem-horario');
const horariosSection = document.getElementById('med-horarios-section');
const horariosListEl = document.getElementById('med-horarios-list');
const addHorarioBtn = document.getElementById('med-add-horario');
const inicioInput = document.getElementById('med-inicio');
const fimInput = document.getElementById('med-fim');

let medicamentosCache = new Map();
let hojeAtualISO = '';
let editingMedId = null;

// ---------- Utilidades ----------
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getHojeLocalISO() {
  return new Date().toLocaleDateString('en-CA');
}

function isDataRealISO(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || '').trim());
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
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || '').trim());
}

function formatDataExtenso(dataISO) {
  if (!dataISO) return '';
  const [y, m, d] = String(dataISO).slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(data);
}

function formatDiaMes(dataISO) {
  if (!dataISO) return '';
  const [, m, d] = String(dataISO).slice(0, 10).split('-');
  return `${d}/${m}`;
}

function formatPeriodo(med) {
  if (!med.dataFim) return 'Uso contínuo';
  return `${formatDiaMes(med.dataInicio)} até ${formatDiaMes(med.dataFim)}`;
}

function formatRotina(med) {
  const dias = Array.isArray(med.diasDaSemana) ? med.diasDaSemana : [];
  const diasTexto = dias.length === 7
    ? 'Todos os dias'
    : dias.map((d) => DIAS_CURTOS[d]).filter(Boolean).join(', ');

  const horarios = Array.isArray(med.horarios) ? med.horarios : [];
  const horariosTexto = horarios.length > 0 ? horarios.join(', ') : 'Sem horário';

  return `${diasTexto} · ${horariosTexto}${med.dose ? ` · ${med.dose}` : ''}`;
}

function mostrarErroAcao(mensagem) {
  actionError.textContent = mensagem;
  actionError.hidden = false;
  actionError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparErroAcao() {
  actionError.hidden = true;
}

function limparErrosFormulario() {
  medError.hidden = true;
  medForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
  });
}

function mostrarErroFormulario(mensagem, campo) {
  medError.textContent = mensagem;
  medError.hidden = false;
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

async function fetchAPI(endpoint) {
  const response = await fetch(endpoint, { credentials: 'same-origin' });
  if (response.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Não autorizado');
  }
  if (!response.ok) {
    throw new Error('Erro na requisição');
  }
  return response.json();
}

function falhaAoCarregar() {
  loadingState.hidden = true;
  content.hidden = true;
  errorState.hidden = false;
}

// ---------- Renderização ----------
function renderizarMedicamentos(data) {
  limparErroAcao();
  hojeAtualISO = data.hoje || getHojeLocalISO();

  const dosesHoje = Array.isArray(data.dosesHoje) ? data.dosesHoje : [];
  const medicamentos = Array.isArray(data.medicamentos) ? data.medicamentos : [];

  medicamentosCache = new Map();
  medicamentos.forEach((m) => medicamentosCache.set(String(m._id), m));

  petSubtitle.textContent = `Medicamentos de ${data.pet.nome}`;
  todayTitle.textContent = `Hoje, ${formatDataExtenso(hojeAtualISO)}`;

  // 1. Doses de hoje
  todayList.innerHTML = dosesHoje.map((dose) => {
    const horarioTexto = dose.horario || 'Sem horário';
    if (dose.tomado) {
      const infoTomado = dose.doseRegistrada
        ? `Tomado: ${dose.doseRegistrada}`
        : 'Tomado';

      return `
      <article class="card is-done med-dose-card" data-med-id="${esc(dose.medicamentoId)}" data-horario="${esc(dose.horario)}">
        <div class="card__row">
          <h3 class="card__title">${esc(dose.nome)}</h3>
          <span class="card__time">${esc(horarioTexto)}</span>
        </div>
        <p class="card__meta">${esc(dose.dose)}</p>
        <p class="med-taken-status">${checkSvg}<span>${esc(infoTomado)}</span></p>
        <div class="card__actions">
          <button type="button" class="btn btn--sm btn--outline" data-action="desfazer">Desfazer</button>
        </div>
      </article>`;
    }

    return `
    <article class="card card--brand med-dose-card" data-med-id="${esc(dose.medicamentoId)}" data-horario="${esc(dose.horario)}">
      <div class="card__row">
        <h3 class="card__title">${esc(dose.nome)}</h3>
        <span class="card__time">${esc(horarioTexto)}</span>
      </div>
      <p class="card__meta">${esc(dose.dose)}</p>
      <input type="text" class="med-dose-input" maxlength="100"
        placeholder="Dose específica (ex.: 50 mg)"
        aria-label="Dose específica para ${esc(dose.nome)}" hidden>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="dose-especifica">Dose específica</button>
        <button type="button" class="btn btn--sm" data-action="tomar">Registrar como tomado</button>
      </div>
    </article>`;
  }).join('');

  todayEmpty.hidden = dosesHoje.length > 0;

  // 2. Plano atual (somente ativos)
  const ativos = medicamentos.filter((m) => m.status === 'ativo');
  planList.innerHTML = ativos.map((m) => `
    <article class="card card--brand plan-card" data-id="${esc(m._id)}">
      <div class="card__row">
        <h3 class="card__title">${esc(m.medicamento)}</h3>
        <span class="plan-card__period">${esc(formatPeriodo(m))}</span>
      </div>
      <p class="plan-card__schedule">${esc(formatRotina(m))}</p>
      <p class="card__meta">${esc(m.formato)}${m.principioAtivo ? ` · ${esc(m.principioAtivo)}` : ''}</p>
    </article>`).join('');

  planEmpty.hidden = ativos.length > 0;

  // 3. Medicamentos salvos (todos)
  savedList.innerHTML = medicamentos.map((m) => {
    let cardClass = 'saved-card--arquivado';
    let label = 'Arquivado';
    let icon = archiveSvg;

    if (m.status === 'ativo') {
      cardClass = 'saved-card--ativo';
      label = 'Ativo';
      icon = activeSvg;
    } else if (m.status === 'concluido') {
      cardClass = 'saved-card--concluido';
      label = 'Concluído';
      icon = doneSvg;
    }

    const ehArquivado = m.status === 'arquivado';
    const nextStatus = ehArquivado ? 'ativo' : 'arquivado';
    const statusBtnText = ehArquivado ? 'Desarquivar' : 'Arquivar';

    return `
    <article class="card ${cardClass}" data-id="${esc(m._id)}">
      <div class="card__row">
        ${icon}
        <div class="card__main">
          <span class="card__label">${esc(label)}</span>
          <h3 class="card__title">${esc(m.medicamento)}</h3>
        </div>
      </div>
      ${m.principioAtivo ? `<p class="card__meta">${esc(m.principioAtivo)}</p>` : ''}
      <p class="card__meta">${esc(m.formato)}${m.dose ? ` · ${esc(m.dose)}` : ''}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm" data-action="editar" data-id="${esc(m._id)}">Editar detalhes</button>
        <button type="button" class="btn btn--sm btn--outline" data-action="status"
          data-id="${esc(m._id)}" data-status="${esc(nextStatus)}">${esc(statusBtnText)}</button>
      </div>
    </article>`;
  }).join('');

  savedEmpty.hidden = medicamentos.length > 0;
}

// ---------- Campos dinâmicos do diálogo ----------
function atualizarBotaoAddHorario() {
  const total = horariosListEl.querySelectorAll('.med-horario-row').length;
  addHorarioBtn.disabled = total >= MAX_HORARIOS;
}

function adicionarLinhaHorario(valor = '') {
  if (horariosListEl.querySelectorAll('.med-horario-row').length >= MAX_HORARIOS) return;

  const row = document.createElement('div');
  row.className = 'med-horario-row';

  const input = document.createElement('input');
  input.type = 'time';
  input.className = 'med-horario-input';
  input.value = valor;
  input.setAttribute('aria-label', 'Horário da dose');

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn--sm btn--outline';
  removeBtn.dataset.action = 'remover-horario';
  removeBtn.textContent = 'Remover';

  row.appendChild(input);
  row.appendChild(removeBtn);
  horariosListEl.appendChild(row);
  atualizarBotaoAddHorario();
}

function preencherHorarios(lista) {
  horariosListEl.innerHTML = '';
  if (Array.isArray(lista) && lista.length > 0) {
    lista.slice(0, MAX_HORARIOS).forEach((h) => adicionarLinhaHorario(h));
  } else {
    adicionarLinhaHorario('08:00');
  }
}

function atualizarSecaoHorarios() {
  const semHorario = semHorarioCheckbox.checked;
  horariosSection.hidden = semHorario;
  if (!semHorario && horariosListEl.querySelectorAll('.med-horario-row').length === 0) {
    adicionarLinhaHorario('08:00');
  }
  atualizarBotaoAddHorario();
}

function atualizarSecaoSal() {
  salWrapper.hidden = !incluirSalCheckbox.checked;
}

function atualizarSecaoDias() {
  daysGroup.hidden = frequenciaSelect.value !== 'semanal';
}

function definirDiasSelecionados(dias) {
  const conjunto = new Set(dias);
  daysGroup.querySelectorAll('.med-day-btn').forEach((btn) => {
    const ativo = conjunto.has(Number(btn.dataset.day));
    btn.setAttribute('aria-pressed', String(ativo));
  });
}

function obterDiasSelecionados() {
  if (frequenciaSelect.value === 'diario') {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const selecionados = [];
  daysGroup.querySelectorAll('.med-day-btn[aria-pressed="true"]').forEach((btn) => {
    selecionados.push(Number(btn.dataset.day));
  });
  return selecionados.sort((a, b) => a - b);
}

// ---------- Abertura do diálogo (Cadastrar e Editar) ----------
function abrirModalCadastro() {
  editingMedId = null;
  limparErrosFormulario();
  medForm.reset();

  medDialogTitle.textContent = 'Registrar medicamento';
  medDialogSubtitle.textContent = 'Preencha os dados do medicamento e da rotina de aplicação.';
  medSaveBtn.textContent = 'Salvar';
  medDeleteBtn.hidden = true;

  incluirSalCheckbox.checked = false;
  atualizarSecaoSal();

  formatoSelect.value = 'Comprimido';
  unidadeSelect.value = 'mg';
  frequenciaSelect.value = 'diario';
  definirDiasSelecionados([]);
  atualizarSecaoDias();

  semHorarioCheckbox.checked = false;
  preencherHorarios(['08:00']);
  atualizarSecaoHorarios();

  inicioInput.value = hojeAtualISO || getHojeLocalISO();
  fimInput.value = '';

  medDialog.showModal();
  nomeInput.focus();
}

function abrirModalEdicao(medId) {
  const item = medicamentosCache.get(String(medId));
  if (!item) return;

  editingMedId = String(medId);
  limparErrosFormulario();
  medForm.reset();

  medDialogTitle.textContent = 'Editar medicamento';
  medDialogSubtitle.textContent = 'Atualize as informações, horários ou datas deste medicamento.';
  medSaveBtn.textContent = 'Salvar alterações';
  medDeleteBtn.hidden = false;

  nomeInput.value = item.medicamento || '';
  const temSal = Boolean(item.principioAtivo);
  incluirSalCheckbox.checked = temSal;
  principioInput.value = item.principioAtivo || '';
  atualizarSecaoSal();

  formatoSelect.value = FORMATOS_VALIDOS.has(item.formato) ? item.formato : 'Comprimido';
  dosagemInput.value = item.dosagem ?? '';
  unidadeSelect.value = UNIDADES_VALIDAS.has(item.unidade) ? item.unidade : 'mg';

  const dias = Array.isArray(item.diasDaSemana) ? item.diasDaSemana : [];
  if (dias.length === 7) {
    frequenciaSelect.value = 'diario';
    definirDiasSelecionados([]);
  } else {
    frequenciaSelect.value = 'semanal';
    definirDiasSelecionados(dias);
  }
  atualizarSecaoDias();

  const horarios = Array.isArray(item.horarios) ? item.horarios : [];
  semHorarioCheckbox.checked = horarios.length === 0;
  preencherHorarios(horarios);
  atualizarSecaoHorarios();

  inicioInput.value = String(item.dataInicio || '').slice(0, 10);
  fimInput.value = item.dataFim ? String(item.dataFim).slice(0, 10) : '';

  medDialog.showModal();
  nomeInput.focus();
}

// ---------- Eventos do diálogo ----------
incluirSalCheckbox.addEventListener('change', () => {
  atualizarSecaoSal();
  if (incluirSalCheckbox.checked) principioInput.focus();
});

frequenciaSelect.addEventListener('change', atualizarSecaoDias);
semHorarioCheckbox.addEventListener('change', atualizarSecaoHorarios);

addHorarioBtn.addEventListener('click', () => {
  adicionarLinhaHorario('');
  const inputs = horariosListEl.querySelectorAll('.med-horario-input');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

horariosListEl.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-action="remover-horario"]');
  if (!removeBtn) return;
  const row = removeBtn.closest('.med-horario-row');
  if (row) row.remove();
  atualizarBotaoAddHorario();
});

daysGroup.addEventListener('click', (event) => {
  const btn = event.target.closest('.med-day-btn');
  if (!btn) return;
  const atual = btn.getAttribute('aria-pressed') === 'true';
  btn.setAttribute('aria-pressed', String(!atual));
});

medForm.addEventListener('input', (event) => {
  if (event.target.getAttribute && event.target.getAttribute('aria-invalid') === 'true') {
    event.target.removeAttribute('aria-invalid');
  }
});

addMedBtn.addEventListener('click', abrirModalCadastro);
medCloseBtn.addEventListener('click', () => medDialog.close());
medCancelBtn.addEventListener('click', () => medDialog.close());

medDialog.addEventListener('click', (event) => {
  if (event.target === medDialog) medDialog.close();
});

// ---------- Salvar medicamento (POST / PUT) ----------
medForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparErrosFormulario();

  const medicamento = nomeInput.value.trim();
  const principioAtivo = incluirSalCheckbox.checked ? principioInput.value.trim() : '';
  const formato = formatoSelect.value;
  const dosagemStr = dosagemInput.value.trim();
  const unidade = unidadeSelect.value;
  const diasDaSemana = obterDiasSelecionados();
  const dataInicio = inicioInput.value;
  const dataFim = fimInput.value;

  if (medicamento.length < 1 || medicamento.length > 100) {
    mostrarErroFormulario('Informe o nome de farmácia (entre 1 e 100 caracteres).', nomeInput);
    return;
  }

  if (principioAtivo.length > 100) {
    mostrarErroFormulario('O nome da droga/sal deve ter no máximo 100 caracteres.', principioInput);
    return;
  }

  if (!FORMATOS_VALIDOS.has(formato)) {
    mostrarErroFormulario('Selecione um formato válido.', formatoSelect);
    return;
  }

  const dosagem = Number(dosagemStr);
  if (!dosagemStr || !Number.isFinite(dosagem) || dosagem <= 0) {
    mostrarErroFormulario('A dosagem deve ser um número maior que zero.', dosagemInput);
    return;
  }

  if (!UNIDADES_VALIDAS.has(unidade)) {
    mostrarErroFormulario('Selecione uma unidade válida.', unidadeSelect);
    return;
  }

  if (diasDaSemana.length === 0) {
    mostrarErroFormulario('Escolha pelo menos um dia da semana.');
    return;
  }

  let horarios = [];
  if (!semHorarioCheckbox.checked) {
    const inputs = Array.from(horariosListEl.querySelectorAll('.med-horario-input'));
    if (inputs.length === 0) {
      mostrarErroFormulario('Adicione pelo menos um horário ou marque "Sem horário".');
      return;
    }
    if (inputs.length > MAX_HORARIOS) {
      mostrarErroFormulario(`Informe no máximo ${MAX_HORARIOS} horários.`);
      return;
    }

    const vistos = new Set();
    for (const input of inputs) {
      const h = input.value.trim();
      if (!isHorarioValido(h)) {
        mostrarErroFormulario('Preencha todos os horários no formato HH:MM.', input);
        return;
      }
      if (vistos.has(h)) {
        mostrarErroFormulario('Não repita horários iguais.', input);
        return;
      }
      vistos.add(h);
      horarios.push(h);
    }
  }

  if (!isDataRealISO(dataInicio)) {
    mostrarErroFormulario('Informe uma data de início válida.', inicioInput);
    return;
  }

  if (dataFim) {
    if (!isDataRealISO(dataFim)) {
      mostrarErroFormulario('Informe uma data de fim válida.', fimInput);
      return;
    }
    if (dataFim < dataInicio) {
      mostrarErroFormulario('A data de fim não pode ser anterior à data de início.', fimInput);
      return;
    }
  }

  const petId = sessionStorage.getItem('activePetId');
  const payload = {
    medicamento,
    principioAtivo,
    formato,
    dosagem,
    unidade,
    diasDaSemana,
    horarios,
    dataInicio,
    dataFim: dataFim || null,
  };

  const url = editingMedId
    ? `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(editingMedId)}`
    : `/api/pets/${encodeURIComponent(petId)}/medicamentos`;
  const method = editingMedId ? 'PUT' : 'POST';

  medSaveBtn.disabled = true;
  medDeleteBtn.disabled = true;
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroFormulario(resData.message || 'Erro ao salvar medicamento.');
      return;
    }

    medDialog.close();
    await carregarMedicamentosDoPet(petId);
  } catch {
    mostrarErroFormulario('Erro de comunicação com o servidor.');
  } finally {
    medSaveBtn.disabled = false;
    medDeleteBtn.disabled = false;
  }
});

// ---------- Excluir medicamento ----------
medDeleteBtn.addEventListener('click', async () => {
  if (!editingMedId) return;
  if (!window.confirm('Deseja realmente excluir este medicamento e seu histórico de doses?')) return;

  medError.hidden = true;
  const petId = sessionStorage.getItem('activePetId');
  medSaveBtn.disabled = true;
  medDeleteBtn.disabled = true;

  try {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(editingMedId)}`,
      {
        method: 'DELETE',
        credentials: 'same-origin',
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroFormulario(resData.message || 'Erro ao excluir medicamento.');
      return;
    }

    medDialog.close();
    await carregarMedicamentosDoPet(petId);
  } catch {
    mostrarErroFormulario('Erro de comunicação com o servidor.');
  } finally {
    medSaveBtn.disabled = false;
    medDeleteBtn.disabled = false;
  }
});

// ---------- Ações nos cards (doses, edição e arquivamento) ----------
async function registrarDoseTomada(card, btn) {
  limparErroAcao();
  const petId = sessionStorage.getItem('activePetId');
  const medId = card.dataset.medId;
  const horario = card.dataset.horario || '';
  const inputEspecifica = card.querySelector('.med-dose-input');
  const doseEspecifica = inputEspecifica && !inputEspecifica.hidden ? inputEspecifica.value.trim() : '';

  if (doseEspecifica.length > 100) {
    mostrarErroAcao('A dose específica deve ter no máximo 100 caracteres.');
    inputEspecifica.focus();
    return;
  }

  btn.disabled = true;
  try {
    const payload = doseEspecifica ? { horario, doseEspecifica } : { horario };
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(medId)}/doses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroAcao(resData.message || 'Erro ao registrar dose.');
      return;
    }

    await carregarMedicamentosDoPet(petId);
  } catch {
    mostrarErroAcao('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
}

async function desfazerDoseTomada(card, btn) {
  limparErroAcao();
  const petId = sessionStorage.getItem('activePetId');
  const medId = card.dataset.medId;
  const horario = card.dataset.horario || '';

  btn.disabled = true;
  try {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(medId)}/doses?horario=${encodeURIComponent(horario)}`,
      {
        method: 'DELETE',
        credentials: 'same-origin',
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroAcao(resData.message || 'Erro ao desfazer registro da dose.');
      return;
    }

    await carregarMedicamentosDoPet(petId);
  } catch {
    mostrarErroAcao('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
}

async function alterarStatusCard(medId, novoStatus, btn) {
  limparErroAcao();
  const petId = sessionStorage.getItem('activePetId');

  btn.disabled = true;
  try {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(medId)}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: novoStatus }),
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroAcao(resData.message || 'Erro ao alterar status do medicamento.');
      return;
    }

    await carregarMedicamentosDoPet(petId);
  } catch {
    mostrarErroAcao('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;

  const acao = btn.dataset.action;

  if (acao === 'dose-especifica') {
    const card = btn.closest('.med-dose-card');
    const input = card && card.querySelector('.med-dose-input');
    if (!input) return;
    input.hidden = !input.hidden;
    if (!input.hidden) input.focus();
    return;
  }

  if (acao === 'tomar') {
    const card = btn.closest('.med-dose-card');
    if (card) registrarDoseTomada(card, btn);
    return;
  }

  if (acao === 'desfazer') {
    const card = btn.closest('.med-dose-card');
    if (card) desfazerDoseTomada(card, btn);
    return;
  }

  if (acao === 'editar' && btn.dataset.id) {
    abrirModalEdicao(btn.dataset.id);
    return;
  }

  if (acao === 'status' && btn.dataset.id && btn.dataset.status) {
    alterarStatusCard(btn.dataset.id, btn.dataset.status, btn);
  }
});

// ---------- Carregamento ----------
async function carregarMedicamentosDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  try {
    const data = await fetchAPI(`/api/pets/${encodeURIComponent(petId)}/medicamentos`);
    renderizarMedicamentos(data);

    loadingState.hidden = true;
    content.hidden = false;
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

async function inicializarAplicacao() {
  try {
    const pets = await fetchAPI('/api/pets');

    if (pets.length === 0) {
      window.location.href = 'cadastro-pet.html';
      return;
    }

    petSwitcherContainer.hidden = pets.length === 1;
    petListEl.innerHTML = '';

    let activePetId = sessionStorage.getItem('activePetId');
    if (!activePetId || !pets.some((p) => p._id === activePetId)) {
      activePetId = pets[0]._id;
      sessionStorage.setItem('activePetId', activePetId);
    }

    pets.forEach((pet) => {
      const isActive = pet._id === activePetId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pet-avatar ${isActive ? 'is-active' : ''}`;
      btn.title = pet.nome;
      btn.setAttribute('aria-label', pet.nome);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.innerHTML = pawSvg;

      btn.addEventListener('click', () => {
        if (pet._id === sessionStorage.getItem('activePetId')) return;
        sessionStorage.setItem('activePetId', pet._id);

        document.querySelectorAll('.pet-avatar').forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');

        carregarMedicamentosDoPet(pet._id);
      });

      petListEl.appendChild(btn);
    });

    await carregarMedicamentosDoPet(activePetId);
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

retryBtn.addEventListener('click', () => location.reload());
inicializarAplicacao();
