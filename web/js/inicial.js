/*
* Autoria: Mateus de Souza Campos | RA: 25009935
* Integração e Lógica: Felipe Nasser Coelho Moussa | RA: 25004922
*/

const pawSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2" ry="2.8" /><ellipse cx="10" cy="5.8" rx="2" ry="2.8" /><ellipse cx="14" cy="5.8" rx="2" ry="2.8" /><ellipse cx="18" cy="10" rx="2" ry="2.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.4 0 1.6 1.3 2.6 2.9 2.6 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.6 0 2.9-1 2.9-2.6C17.5 14 15 11 12 11z" /></svg>`;

const calendarSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>`;

const clockSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>`;

const alertSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 1.5 21h21L12 3zm0 6 6.9 12H5.1L12 9zm-1 3v4h2v-4h-2zm0 5v2h2v-2h-2z" /></svg>`;

// Elementos
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const painelContent = document.getElementById('painel-content');

const dateEl = document.getElementById('today-date');
const petNameEl = document.getElementById('pet-name');
const petListEl = document.getElementById('pet-list');
const petSwitcherContainer = document.getElementById('pet-switcher-container');

// Listas e Empty States
const sections = {
  meds: { list: document.getElementById('med-list'), empty: document.getElementById('meds-empty') },
  today: { list: document.getElementById('today-list'), empty: document.getElementById('today-empty') },
  next: { list: document.getElementById('next-list'), empty: document.getElementById('next-empty') },
  late: { list: document.getElementById('late-list'), empty: document.getElementById('late-empty') }
};

// Data
dateEl.textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const formatData = (dataISO) => {
  if (!dataISO) return '';
  const [y, m, d] = String(dataISO).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

function getHojeISO() {
  return new Date().toLocaleDateString('en-CA');
}

function diffDiasAte(dataAlvoISO) {
  if (!dataAlvoISO) return null;
  const [y1, m1, d1] = getHojeISO().split('-').map(Number);
  const [y2, m2, d2] = String(dataAlvoISO).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function tituloVacina(vacina, fallback) {
  const base = (vacina && vacina.titulo) || fallback || 'Vacina';
  return vacina && vacina.dose ? `${base} · ${vacina.dose}` : base;
}

// Evita que texto vindo do banco seja interpretado como HTML
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// Wrapper API
async function fetchAPI(endpoint) {
  const response = await fetch(endpoint);
  if (response.status === 401) {
    window.location.href = "login.html";
    throw new Error("Não autorizado");
  }
  if (!response.ok) {
    throw new Error("Erro na requisição");
  }
  return response.json();
}

let consultasCache = new Map();
let vacinasCache = new Map();

async function carregarPainelDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  painelContent.hidden = true;

  try {
    const [data, consultasData, vacinasData] = await Promise.all([
      fetchAPI(`/api/pets/${petId}/dashboard`),
      fetchAPI(`/api/pets/${petId}/consultas`),
      fetchAPI(`/api/pets/${petId}/vacinas`),
    ]);

    consultasCache = new Map();
    consultasData.historico.forEach((c) => consultasCache.set(String(c._id), { ...c, status: 'realizada' }));
    consultasData.proximas.forEach((c) => consultasCache.set(String(c._id), { ...c, motivo: c.titulo, status: 'agendada' }));

    vacinasCache = new Map();
    (vacinasData.aplicadas || []).forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'aplicada' }));
    (vacinasData.proximas || []).forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'pendente' }));

    renderizarDashboard(data);

    loadingState.hidden = true;
    painelContent.hidden = false;
  } catch (error) {
    if (error.message !== "Não autorizado") {
      loadingState.hidden = true;
      errorState.hidden = false;
    }
  }
}

function renderizarDashboard(data) {
  petNameEl.textContent = data.pet.nome;

  // Renderiza Medicamentos
  sections.meds.list.innerHTML = '';
  if (data.medicamentosHoje.length === 0) {
    sections.meds.empty.hidden = false;
  } else {
    sections.meds.empty.hidden = true;
    data.medicamentosHoje.forEach(med => {
      const isDoneClass = med.tomado ? 'is-done' : 'card--brand';
      const btnText = med.tomado ? 'Tomado' : 'Registrar como tomado';

      sections.meds.list.innerHTML += `
        <article class="card ${isDoneClass}">
          <div class="card__row">
            <h3 class="card__title">${esc(med.nome)}</h3>
            <span class="card__time">${esc(med.horario)}</span>
          </div>
          <p class="card__meta">${esc(med.dose)}</p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
            <button type="button" class="btn btn--sm" disabled>${esc(btnText)}</button>
          </div>
        </article>`;
    });
  }

  // Renderiza Consultas de Hoje
  sections.today.list.innerHTML = '';
  if (data.hoje.length === 0) {
    sections.today.empty.hidden = false;
  } else {
    sections.today.empty.hidden = true;
    data.hoje.forEach(item => {
      const consulta = consultasCache.get(String(item.id));
      const dataStr = consulta ? formatData(consulta.data) : item.registro;
      const dataISO = consulta ? String(consulta.data || '').slice(0, 10) : '';

      sections.today.list.innerHTML += `
        <article class="card card--warning" data-id="${esc(item.id)}" data-date="${esc(dataISO)}">
          <div class="card__row">
            ${clockSvg}
            <div class="card__main">
              <span class="card__label">Hoje</span>
              <h3 class="card__title">${esc(item.titulo)}</h3>
            </div>
          </div>
          <p class="card__meta">Data: ${esc(dataStr)}${item.registro ? ` às ${esc(item.registro)}` : ''}</p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
            <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(item.id)}">Ver detalhes</button>
          </div>
        </article>`;
    });
  }

  // Renderiza Próximos 7 Dias
  sections.next.list.innerHTML = '';
  if (data.proximos7Dias.length === 0) {
    sections.next.empty.hidden = false;
  } else {
    sections.next.empty.hidden = true;
    data.proximos7Dias.forEach(item => {
      const idStr = String(item.id);
      const ehConsulta = consultasCache.has(idStr);
      const vacina = vacinasCache.get(idStr);
      const dataISO = String(item.data || '').slice(0, 10);

      if (ehConsulta) {
        sections.next.list.innerHTML += `
          <article class="card card--neutral" data-id="${esc(item.id)}" data-date="${esc(dataISO)}">
            <div class="card__row">
              ${calendarSvg}
              <h3 class="card__title">${esc(item.titulo)}</h3>
            </div>
            <p class="card__meta">Data esperada: ${esc(formatData(item.data))}</p>
            <div class="card__actions">
              <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
              <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(item.id)}">Ver detalhes</button>
            </div>
          </article>`;
      } else if (vacina) {
        sections.next.list.innerHTML += `
          <article class="card card--warning" data-id="${esc(item.id)}" data-date="${esc(dataISO)}">
            <div class="card__row">
              ${clockSvg}
              <div class="card__main">
                <span class="card__label">No limite</span>
                <h3 class="card__title">${esc(tituloVacina(vacina, item.titulo))}</h3>
              </div>
            </div>
            <p class="card__meta">Data esperada: ${esc(formatData(item.data))}</p>
            <div class="card__actions">
              <button type="button" class="btn btn--sm btn--outline" data-action="vacina-detalhes" data-id="${esc(item.id)}">Ver detalhes</button>
              <button type="button" class="btn btn--sm" data-action="vacina-aplicar" data-id="${esc(item.id)}">Marcar como aplicada</button>
            </div>
          </article>`;
      } else {
        sections.next.list.innerHTML += `
          <article class="card card--neutral">
            <div class="card__row">
              ${calendarSvg}
              <h3 class="card__title">${esc(item.titulo)}</h3>
            </div>
            <p class="card__meta">Data esperada: ${esc(formatData(item.data))}</p>
            <div class="card__actions">
              <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
            </div>
          </article>`;
      }
    });
  }

  // Renderiza Vacinas Atrasadas
  sections.late.list.innerHTML = '';
  if (data.atrasados.length === 0) {
    sections.late.empty.hidden = false;
  } else {
    sections.late.empty.hidden = true;
    data.atrasados.forEach(item => {
      const vacina = vacinasCache.get(String(item.id));
      const dataISO = String(item.data || '').slice(0, 10);

      if (vacina) {
        sections.late.list.innerHTML += `
          <article class="card card--danger" data-id="${esc(item.id)}" data-date="${esc(dataISO)}">
            <div class="card__row">
              ${alertSvg}
              <div class="card__main">
                <span class="card__label">Atrasada</span>
                <h3 class="card__title">${esc(tituloVacina(vacina, item.titulo))}</h3>
              </div>
            </div>
            <p class="card__meta">Data esperada: ${esc(formatData(item.data))}</p>
            <div class="card__actions">
              <button type="button" class="btn btn--sm btn--outline" data-action="vacina-detalhes" data-id="${esc(item.id)}">Ver detalhes</button>
              <button type="button" class="btn btn--sm" data-action="vacina-aplicar" data-id="${esc(item.id)}">Marcar como aplicada</button>
            </div>
          </article>`;
      } else {
        sections.late.list.innerHTML += `
          <article class="card card--danger">
            <div class="card__row">
              ${alertSvg}
              <h3 class="card__title">${esc(item.titulo)}</h3>
            </div>
            <p class="card__meta">${esc(formatData(item.data))}</p>
            <div class="card__actions">
              <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
            </div>
          </article>`;
      }
    });
  }
}

// Documentos da consulta
const docDialog = document.getElementById('doc-dialog');
const docSubtitle = document.getElementById('doc-subtitle');
const docStatus = document.getElementById('doc-status');
const docList = document.getElementById('doc-list');
const docForm = document.getElementById('doc-form');
const docFile = document.getElementById('doc-file');
const docError = document.getElementById('doc-error');
const docSubmit = document.getElementById('doc-submit');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
let currentConsultaId = null;

function docsEndpoint() {
  return `/api/pets/${sessionStorage.getItem('activePetId')}/consultas/${currentConsultaId}/documentos`;
}

function showDocError(message) {
  docError.textContent = message;
  docError.hidden = false;
}

function safeUrl(url) {
  return /^(\/|https?:\/\/)/.test(String(url)) ? url : '#';
}

async function carregarDocumentos() {
  docList.innerHTML = '';
  docStatus.textContent = 'Carregando documentos...';
  docStatus.hidden = false;

  try {
    const docs = await fetchAPI(docsEndpoint());

    docList.innerHTML = docs.map((d) => {
      const ehPdf = /\.pdf$/i.test(d.nome || '');
      return `
      <li class="doc-item">
        <a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.nome)}</a>
        <span class="doc-item__type">${ehPdf ? 'PDF' : 'Imagem'}</span>
      </li>`;
    }).join('');

    docStatus.textContent = 'Nenhum documento anexado.';
    docStatus.hidden = docs.length > 0;
  } catch (error) {
    if (error.message !== 'Não autorizado') {
      docStatus.textContent = 'Não foi possível carregar os documentos.';
    }
  }
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="documentos"]');
  if (!btn) return;

  const card = btn.closest('[data-id]');
  if (!card || !card.dataset.id) return;
  currentConsultaId = card.dataset.id;

  const titulo = card.querySelector('.card__title').textContent;
  const data = formatData(card.dataset.date);
  docSubtitle.textContent = data ? `${titulo} — ${data}` : titulo;

  docError.hidden = true;
  docForm.reset();
  docDialog.showModal();
  carregarDocumentos();
});

document.getElementById('doc-close').addEventListener('click', () => docDialog.close());
docDialog.addEventListener('click', (event) => {
  if (event.target === docDialog) docDialog.close();
});

docForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  docError.hidden = true;

  const files = Array.from(docFile.files);
  if (files.length === 0) {
    showDocError('Escolha pelo menos um arquivo.');
    return;
  }

  for (const file of files) {
    const tipoOk = file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!tipoOk) {
      showDocError(`"${file.name}" não é PDF nem imagem.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showDocError(`"${file.name}" passa de 10 MB.`);
      return;
    }
  }

  const body = new FormData();
  files.forEach((file) => body.append('arquivos', file));

  docSubmit.disabled = true;
  try {
    const response = await fetch(docsEndpoint(), {
      method: 'POST',
      credentials: 'same-origin',
      body
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showDocError(data.message || 'Erro ao enviar os documentos.');
      return;
    }

    docForm.reset();
    await carregarDocumentos();
  } catch {
    showDocError('Erro de comunicação com o servidor.');
  } finally {
    docSubmit.disabled = false;
  }
});

// Detalhes da consulta
const detailDialog = document.getElementById('detail-dialog');
const detailClose = document.getElementById('detail-close');
const detailForm = document.getElementById('detail-form');
const detailError = document.getElementById('detail-error');
const detailStatusLabel = document.getElementById('detail-status-label');
const detailDataInput = document.getElementById('detail-data');
const detailHorarioInput = document.getElementById('detail-horario');
const detailRealizadaFields = document.getElementById('detail-realizada-fields');
const detailSaveBtn = document.getElementById('detail-save');
const detailDeleteBtn = document.getElementById('detail-delete');

let editingConsultaId = null;

function atualizarCamposDetalhesRealizada() {
  const agora = new Date();
  const hojeStr = agora.toLocaleDateString('en-CA');
  const horaStr = agora.toTimeString().slice(0, 5);
  const d = detailDataInput.value;
  const h = detailHorarioInput.value || '00:00';
  const ehPassadoOuAgora = Boolean(d) && (d < hojeStr || (d === hojeStr && h <= horaStr));
  detailRealizadaFields.hidden = !ehPassadoOuAgora;
  detailStatusLabel.textContent = ehPassadoOuAgora
    ? 'Status: Consulta realizada'
    : 'Status: Consulta agendada';
}

function abrirDetalhesConsulta(consultaId) {
  const item = consultasCache.get(String(consultaId));
  if (!item) return;

  editingConsultaId = String(consultaId);
  detailError.hidden = true;
  detailForm.reset();

  document.getElementById('detail-motivo').value = item.motivo || '';
  detailDataInput.value = String(item.data || '').slice(0, 10);
  detailHorarioInput.value = String(item.horario || '').slice(0, 5);
  document.getElementById('detail-local').value = item.local || '';
  document.getElementById('detail-vet').value = item.medico || '';
  document.getElementById('detail-diagnostico').value = item.diagnostico || '';
  document.getElementById('detail-obs').value = item.observacoes || '';

  atualizarCamposDetalhesRealizada();
  detailDialog.showModal();
}

detailDataInput.addEventListener('change', atualizarCamposDetalhesRealizada);
detailHorarioInput.addEventListener('change', atualizarCamposDetalhesRealizada);

detailClose.addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="detalhes"]');
  if (!btn) return;
  abrirDetalhesConsulta(btn.dataset.id);
});

detailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editingConsultaId) return;
  detailError.hidden = true;

  const petId = sessionStorage.getItem('activePetId');
  const payload = {
    motivo: document.getElementById('detail-motivo').value.trim(),
    data: detailDataInput.value,
    horario: detailHorarioInput.value,
    local: document.getElementById('detail-local').value.trim(),
    veterinario: document.getElementById('detail-vet').value.trim(),
    diagnostico: document.getElementById('detail-diagnostico').value.trim(),
    observacoes: document.getElementById('detail-obs').value.trim(),
  };

  detailSaveBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${petId}/consultas/${editingConsultaId}`, {
      method: 'PUT',
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
      detailError.textContent = resData.message || 'Erro ao atualizar consulta.';
      detailError.hidden = false;
      return;
    }

    detailDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    detailError.textContent = 'Erro de comunicação com o servidor.';
    detailError.hidden = false;
  } finally {
    detailSaveBtn.disabled = false;
  }
});

detailDeleteBtn.addEventListener('click', async () => {
  if (!editingConsultaId) return;
  if (!window.confirm('Deseja realmente excluir esta consulta?')) return;

  detailError.hidden = true;
  const petId = sessionStorage.getItem('activePetId');
  detailDeleteBtn.disabled = true;

  try {
    const response = await fetch(`/api/pets/${petId}/consultas/${editingConsultaId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      detailError.textContent = resData.message || 'Erro ao excluir consulta.';
      detailError.hidden = false;
      return;
    }

    detailDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    detailError.textContent = 'Erro de comunicação com o servidor.';
    detailError.hidden = false;
  } finally {
    detailDeleteBtn.disabled = false;
  }
});

// Detalhes da vacina
const vaccineDialog = document.getElementById('vaccine-dialog');
const vaccineTitle = document.getElementById('vaccine-title');
const vaccineSubtitle = document.getElementById('vaccine-subtitle');
const vaccineClose = document.getElementById('vaccine-close');
const vaccineForm = document.getElementById('vaccine-form');
const vaccineError = document.getElementById('vaccine-error');
const vaccineSaveBtn = document.getElementById('vaccine-save');
const vaccineDeleteBtn = document.getElementById('vaccine-delete');

const statusAplicadaRadio = document.getElementById('status-aplicada');
const statusPendenteRadio = document.getElementById('status-pendente');
const vacinaTituloInput = document.getElementById('vacina-titulo');
const vacinaDoseSelect = document.getElementById('vacina-dose');
const appliedFields = document.getElementById('applied-fields');
const pendingFields = document.getElementById('pending-fields');
const pendingStatusPreview = document.getElementById('pending-status-preview');
const dataAplicacaoInput = document.getElementById('vacina-data-aplicacao');
const loteInput = document.getElementById('vacina-lote');
const fabricanteInput = document.getElementById('vacina-fabricante');
const proximaDoseLabel = document.getElementById('proxima-dose-label');
const proximaDoseInput = document.getElementById('vacina-proxima-dose');
const proximaDoseHint = document.getElementById('proxima-dose-hint');
const vacinaLocalInput = document.getElementById('vacina-local');
const vacinaLocalLabel = document.querySelector('label[for="vacina-local"]');
const vacinaVetInput = document.getElementById('vacina-veterinario');
const vacinaVetLabel = document.querySelector('label[for="vacina-veterinario"]');
const vacinaObsInput = document.getElementById('vacina-obs');

let editingVacinaId = null;

function getStatusVacina() {
  return statusPendenteRadio.checked ? 'pendente' : 'aplicada';
}

function limparErrosVacina() {
  vaccineError.hidden = true;
  vaccineForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
  });
}

function mostrarErroVacina(mensagem, campo) {
  vaccineError.textContent = mensagem;
  vaccineError.hidden = false;
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function atualizarPreviewVacinaPendente() {
  const data = proximaDoseInput.value;
  if (!data) {
    pendingStatusPreview.textContent = 'Informe a data esperada abaixo para agendar a aplicação desta dose.';
    return;
  }

  const dias = diffDiasAte(data);
  if (dias < 0) {
    const atraso = Math.abs(dias);
    pendingStatusPreview.textContent = `Atenção: esta dose está atrasada há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}.`;
  } else if (dias === 0) {
    pendingStatusPreview.textContent = 'No limite: a aplicação desta dose está prevista para hoje.';
  } else if (dias <= 7) {
    pendingStatusPreview.textContent = `No limite: a aplicação está prevista para daqui a ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
  } else {
    pendingStatusPreview.textContent = `Agendada para ${formatData(data)} (em ${dias} dias).`;
  }
}

function atualizarModoVacina() {
  const ehPendente = getStatusVacina() === 'pendente';

  appliedFields.hidden = ehPendente;
  pendingFields.hidden = !ehPendente;

  dataAplicacaoInput.required = !ehPendente;
  proximaDoseInput.required = ehPendente;
  vacinaLocalInput.required = !ehPendente;
  vacinaVetInput.required = !ehPendente;

  if (ehPendente) {
    proximaDoseLabel.textContent = 'Data esperada';
    proximaDoseHint.textContent = 'Data prevista para aplicar esta dose no pet.';
    vacinaLocalLabel.innerHTML = 'Clínica / Local <span class="optional">(opcional)</span>';
    vacinaVetLabel.innerHTML = 'Médico veterinário <span class="optional">(opcional)</span>';
    atualizarPreviewVacinaPendente();
  } else {
    proximaDoseLabel.innerHTML = 'Próxima dose <span class="optional">(opcional)</span>';
    proximaDoseHint.textContent = 'Data prevista para o próximo reforço (apenas para controle).';
    vacinaLocalLabel.textContent = 'Clínica / Local';
    vacinaVetLabel.textContent = 'Médico veterinário';
    dataAplicacaoInput.max = getHojeISO();
  }
}

function abrirModalVacina(vacinaId, marcarComoAplicada = false) {
  const item = vacinasCache.get(String(vacinaId));
  if (!item) return;

  editingVacinaId = String(vacinaId);
  limparErrosVacina();
  vaccineForm.reset();

  const ehPendente = !marcarComoAplicada && item.status === 'pendente';
  vaccineTitle.textContent = marcarComoAplicada ? 'Marcar como aplicada' : 'Detalhes da vacina';
  vaccineSubtitle.textContent = marcarComoAplicada
    ? 'Confirme os dados da aplicação desta dose.'
    : (ehPendente ? 'Situação: Dose agendada' : 'Situação: Vacina aplicada');
  vaccineSaveBtn.textContent = marcarComoAplicada ? 'Confirmar aplicação' : 'Salvar alterações';

  statusAplicadaRadio.checked = !ehPendente;
  statusPendenteRadio.checked = ehPendente;

  vacinaTituloInput.value = item.titulo || '';
  vacinaDoseSelect.value = item.dose || '';
  dataAplicacaoInput.value = marcarComoAplicada ? getHojeISO() : String(item.dataAplicacao || '').slice(0, 10);
  proximaDoseInput.value = marcarComoAplicada ? '' : String(item.proximaDose || '').slice(0, 10);
  loteInput.value = item.lote || '';
  fabricanteInput.value = item.fabricante || '';
  vacinaLocalInput.value = item.local || '';
  vacinaVetInput.value = item.veterinario || '';
  vacinaObsInput.value = item.observacoes || '';

  atualizarModoVacina();
  vaccineDialog.showModal();
  if (marcarComoAplicada) vacinaLocalInput.focus();
}

statusAplicadaRadio.addEventListener('change', () => {
  limparErrosVacina();
  if (!dataAplicacaoInput.value) dataAplicacaoInput.value = getHojeISO();
  atualizarModoVacina();
});

statusPendenteRadio.addEventListener('change', () => {
  limparErrosVacina();
  atualizarModoVacina();
});

proximaDoseInput.addEventListener('change', () => {
  if (getStatusVacina() === 'pendente') atualizarPreviewVacinaPendente();
});

vaccineForm.addEventListener('input', (event) => {
  if (event.target.getAttribute('aria-invalid') === 'true') {
    event.target.removeAttribute('aria-invalid');
  }
});

vaccineClose.addEventListener('click', () => vaccineDialog.close());
vaccineDialog.addEventListener('click', (event) => {
  if (event.target === vaccineDialog) vaccineDialog.close();
});

document.addEventListener('click', (event) => {
  const detalheBtn = event.target.closest('[data-action="vacina-detalhes"]');
  if (detalheBtn && detalheBtn.dataset.id) {
    abrirModalVacina(detalheBtn.dataset.id, false);
    return;
  }

  const aplicarBtn = event.target.closest('[data-action="vacina-aplicar"]');
  if (aplicarBtn && aplicarBtn.dataset.id) {
    abrirModalVacina(aplicarBtn.dataset.id, true);
  }
});

vaccineForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editingVacinaId) return;
  limparErrosVacina();

  const status = getStatusVacina();
  const titulo = vacinaTituloInput.value.trim();
  const dose = vacinaDoseSelect.value;
  const dataAplicacao = dataAplicacaoInput.value;
  const proximaDose = proximaDoseInput.value;
  const lote = loteInput.value.trim();
  const fabricante = fabricanteInput.value.trim();
  const local = vacinaLocalInput.value.trim();
  const veterinario = vacinaVetInput.value.trim();
  const observacoes = vacinaObsInput.value.trim();
  const hoje = getHojeISO();

  if (titulo.length < 2) {
    mostrarErroVacina('Informe o nome da vacina.', vacinaTituloInput);
    return;
  }
  if (!dose) {
    mostrarErroVacina('Selecione a dose.', vacinaDoseSelect);
    return;
  }

  if (status === 'aplicada') {
    if (!dataAplicacao) {
      mostrarErroVacina('Informe a data da aplicação.', dataAplicacaoInput);
      return;
    }
    if (dataAplicacao > hoje) {
      mostrarErroVacina('A data da aplicação não pode estar no futuro.', dataAplicacaoInput);
      return;
    }
    if (proximaDose && proximaDose < dataAplicacao) {
      mostrarErroVacina('A próxima dose não pode ser anterior à data da aplicação.', proximaDoseInput);
      return;
    }
    if (local.length < 2) {
      mostrarErroVacina('Informe a clínica ou o local da aplicação.', vacinaLocalInput);
      return;
    }
    if (veterinario.length < 2) {
      mostrarErroVacina('Informe o médico veterinário responsável.', vacinaVetInput);
      return;
    }
  } else if (!proximaDose) {
    mostrarErroVacina('Informe a data esperada para agendar a dose.', proximaDoseInput);
    return;
  }

  const petId = sessionStorage.getItem('activePetId');
  const payload = {
    status,
    titulo,
    dose,
    dataAplicacao: status === 'aplicada' ? dataAplicacao : '',
    proximaDose,
    lote: status === 'aplicada' ? lote : '',
    fabricante: status === 'aplicada' ? fabricante : '',
    local,
    veterinario,
    observacoes,
  };

  vaccineSaveBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${petId}/vacinas/${editingVacinaId}`, {
      method: 'PUT',
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
      mostrarErroVacina(resData.message || 'Erro ao atualizar vacina.');
      return;
    }

    vaccineDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroVacina('Erro de comunicação com o servidor.');
  } finally {
    vaccineSaveBtn.disabled = false;
  }
});

vaccineDeleteBtn.addEventListener('click', async () => {
  if (!editingVacinaId) return;
  if (!window.confirm('Deseja realmente excluir este registro de vacina?')) return;

  vaccineError.hidden = true;
  const petId = sessionStorage.getItem('activePetId');
  vaccineDeleteBtn.disabled = true;

  try {
    const response = await fetch(`/api/pets/${petId}/vacinas/${editingVacinaId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroVacina(resData.message || 'Erro ao excluir vacina.');
      return;
    }

    vaccineDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroVacina('Erro de comunicação com o servidor.');
  } finally {
    vaccineDeleteBtn.disabled = false;
  }
});

async function inicializarAplicacao() {
  try {
    // Busca os pets
    const pets = await fetchAPI('/api/pets');

    // Sem pets
    if (pets.length === 0) {
      window.location.href = "cadastro-pet.html";
      return;
    }

    // Verifica 1 pet
    if (pets.length === 1) {
      petSwitcherContainer.style.display = 'none';
    } else {
      petSwitcherContainer.style.display = 'flex';
      petListEl.innerHTML = '';
    }

    // Escolher pet
    let activePetId = sessionStorage.getItem('activePetId');
    if (!activePetId || !pets.some(p => p._id === activePetId)) {
      activePetId = pets[0]._id;
      sessionStorage.setItem('activePetId', activePetId);
    }

    // Seletor
    pets.forEach(pet => {
      const isActive = pet._id === activePetId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pet-avatar ${isActive ? 'is-active' : ''}`;
      btn.title = pet.nome;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.innerHTML = pawSvg;

      btn.addEventListener('click', () => {
        if (pet._id !== sessionStorage.getItem('activePetId')) {
          sessionStorage.setItem('activePetId', pet._id);

          document.querySelectorAll('.pet-avatar').forEach(b => {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');

          carregarPainelDoPet(pet._id);
        }
      });

      petListEl.appendChild(btn);
    });

    // Carrega painel do pet
    await carregarPainelDoPet(activePetId);

  } catch (error) {
    if (error.message !== "Não autorizado") {
      loadingState.hidden = true;
      errorState.hidden = false;
    }
  }
}

inicializarAplicacao();
