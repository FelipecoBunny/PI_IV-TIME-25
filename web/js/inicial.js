/*
* Autoria: Mateus de Souza Campos | RA: 25009935
* Integração e Lógica: Felipe Nasser Coelho Moussa | RA: 25004922
*/

// Ícones personalizados
const pawSvg = `<span class="icon icon--paw" aria-hidden="true"></span>`;
const calendarSvg = `<span class="icon icon--calendar card__icon" aria-hidden="true"></span>`;
const clockSvg = `<span class="icon icon--clock card__icon" aria-hidden="true"></span>`;
const alertSvg = `<span class="icon icon--alert card__icon" aria-hidden="true"></span>`;
const checkSvg = `<span class="icon icon--check" aria-hidden="true"></span>`;
const trashSvg = `<span class="icon icon--trash" aria-hidden="true"></span>`;

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
let medicamentosCache = new Map();
let dosesHojeAtual = [];

async function carregarPainelDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  painelContent.hidden = true;

  try {
    const [data, consultasData, vacinasData, medicamentosData] = await Promise.all([
      fetchAPI(`/api/pets/${petId}/dashboard`),
      fetchAPI(`/api/pets/${petId}/consultas`),
      fetchAPI(`/api/pets/${petId}/vacinas`),
      fetchAPI(`/api/pets/${petId}/medicamentos`),
    ]);

    consultasCache = new Map();
    consultasData.historico.forEach((c) => consultasCache.set(String(c._id), { ...c, status: 'realizada' }));
    consultasData.proximas.forEach((c) => consultasCache.set(String(c._id), { ...c, motivo: c.titulo, status: 'agendada' }));

    vacinasCache = new Map();
    (vacinasData.aplicadas || []).forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'aplicada' }));
    (vacinasData.proximas || []).forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'pendente' }));

    medicamentosCache = new Map();
    (medicamentosData.medicamentos || []).forEach((m) => medicamentosCache.set(String(m._id), m));
    dosesHojeAtual = Array.isArray(medicamentosData.dosesHoje) ? medicamentosData.dosesHoje : [];

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
  medActionError.hidden = true;
  sections.meds.list.innerHTML = '';
  if (dosesHojeAtual.length === 0) {
    sections.meds.empty.hidden = false;
  } else {
    sections.meds.empty.hidden = true;
    sections.meds.list.innerHTML = dosesHojeAtual.map((dose) => {
      const horarioTexto = dose.horario || 'Sem horário';
      if (dose.tomado) {
        const infoTomado = dose.doseRegistrada
          ? `Tomado: ${dose.doseRegistrada}`
          : 'Tomado';

        return `
        <article class="card is-done med-dose-card" data-med-id="${esc(dose.medicamentoId)}" data-horario="${esc(dose.horario || '')}">
          <div class="card__row">
            <h3 class="card__title">${esc(dose.nome)}</h3>
            <span class="card__time">${esc(horarioTexto)}</span>
          </div>
          <p class="card__meta">${esc(dose.dose)}</p>
          <p class="med-taken-status">${checkSvg}<span>${esc(infoTomado)}</span></p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" data-action="med-detalhes" data-id="${esc(dose.medicamentoId)}">Ver detalhes</button>
            <button type="button" class="btn btn--sm" data-action="med-desfazer">Desfazer</button>
          </div>
        </article>`;
      }

      return `
      <article class="card card--brand med-dose-card" data-med-id="${esc(dose.medicamentoId)}" data-horario="${esc(dose.horario || '')}">
        <div class="card__row">
          <h3 class="card__title">${esc(dose.nome)}</h3>
          <span class="card__time">${esc(horarioTexto)}</span>
        </div>
        <p class="card__meta">${esc(dose.dose)}</p>
        <div class="card__actions">
          <button type="button" class="btn btn--sm btn--outline" data-action="med-detalhes" data-id="${esc(dose.medicamentoId)}">Ver detalhes</button>
          <button type="button" class="btn btn--sm" data-action="med-tomar">Registrar como tomado</button>
        </div>
      </article>`;
    }).join('');
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
      const ehPdf = d.tipo === 'application/pdf' || /\.pdf$/i.test(d.nome || '');
      return `
      <li class="doc-item">
        <a class="doc-item__link" href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.nome)}</a>
        <div class="doc-item__meta">
          <span class="doc-item__type">${ehPdf ? 'PDF' : 'Imagem'}</span>
          <button type="button" class="doc-item__delete" data-action="excluir-doc"
            data-doc-id="${esc(d._id)}" data-doc-name="${esc(d.nome)}"
            aria-label="Excluir ${esc(d.nome)}" title="Excluir documento">
            ${trashSvg}
          </button>
        </div>
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

docList.addEventListener('click', async (event) => {
  const btn = event.target.closest('[data-action="excluir-doc"]');
  if (!btn || !btn.dataset.docId) return;

  const nome = btn.dataset.docName || 'este documento';
  if (!window.confirm(`Deseja realmente excluir "${nome}"?`)) return;

  docError.hidden = true;
  btn.disabled = true;
  try {
    const response = await fetch(`${docsEndpoint()}/${encodeURIComponent(btn.dataset.docId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showDocError(data.message || 'Erro ao excluir o documento.');
      return;
    }

    await carregarDocumentos();
  } catch {
    showDocError('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
});

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

// Medicamentos de hoje (tomar, desfazer e detalhes)
const FORMATOS_MED_VALIDOS = new Set(['Comprimido', 'Cápsula', 'Líquido', 'Gotas', 'Pomada', 'Injeção']);
const UNIDADES_MED_VALIDAS = new Set(['mg', 'ml', 'g', 'gotas', 'comprimido', 'cápsula', 'unidade']);
const MAX_HORARIOS_MED = 6;

const medActionError = document.getElementById('med-action-error');
const medDialog = document.getElementById('med-dialog');
const medCloseBtn = document.getElementById('med-close');
const medCancelBtn = document.getElementById('med-cancel');
const medForm = document.getElementById('med-form');
const medError = document.getElementById('med-error');
const medSaveBtn = document.getElementById('med-save');
const medDeleteBtn = document.getElementById('med-delete');

const medNomeInput = document.getElementById('med-nome');
const medIncluirSalCheckbox = document.getElementById('med-incluir-sal');
const medSalWrapper = document.getElementById('med-sal-wrapper');
const medPrincipioInput = document.getElementById('med-principio');
const medFormatoSelect = document.getElementById('med-formato');
const medDosagemInput = document.getElementById('med-dosagem');
const medUnidadeSelect = document.getElementById('med-unidade');
const medFrequenciaSelect = document.getElementById('med-frequencia');
const medDaysGroup = document.getElementById('med-days-group');
const medSemHorarioCheckbox = document.getElementById('med-sem-horario');
const medHorariosSection = document.getElementById('med-horarios-section');
const medHorariosListEl = document.getElementById('med-horarios-list');
const medAddHorarioBtn = document.getElementById('med-add-horario');
const medInicioInput = document.getElementById('med-inicio');
const medFimInput = document.getElementById('med-fim');

let editingMedId = null;

function isDataRealISO(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || '').trim());
  if (!match) return false;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function isHorarioValido(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || '').trim());
}

function mostrarErroMedAcao(mensagem) {
  medActionError.textContent = mensagem;
  medActionError.hidden = false;
}

function limparErrosMedForm() {
  medError.hidden = true;
  medForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
  });
}

function mostrarErroMedForm(mensagem, campo) {
  medError.textContent = mensagem;
  medError.hidden = false;
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function atualizarBotaoAddHorarioMed() {
  const total = medHorariosListEl.querySelectorAll('.med-horario-row').length;
  medAddHorarioBtn.disabled = total >= MAX_HORARIOS_MED;
}

function adicionarLinhaHorarioMed(valor = '') {
  if (medHorariosListEl.querySelectorAll('.med-horario-row').length >= MAX_HORARIOS_MED) return;

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
  medHorariosListEl.appendChild(row);
  atualizarBotaoAddHorarioMed();
}

function preencherHorariosMed(lista) {
  medHorariosListEl.innerHTML = '';
  if (Array.isArray(lista) && lista.length > 0) {
    lista.slice(0, MAX_HORARIOS_MED).forEach((h) => adicionarLinhaHorarioMed(h));
  } else {
    adicionarLinhaHorarioMed('08:00');
  }
}

function atualizarSecaoHorariosMed() {
  const semHorario = medSemHorarioCheckbox.checked;
  medHorariosSection.hidden = semHorario;
  if (!semHorario && medHorariosListEl.querySelectorAll('.med-horario-row').length === 0) {
    adicionarLinhaHorarioMed('08:00');
  }
  atualizarBotaoAddHorarioMed();
}

function atualizarSecaoSalMed() {
  medSalWrapper.hidden = !medIncluirSalCheckbox.checked;
}

function atualizarSecaoDiasMed() {
  medDaysGroup.hidden = medFrequenciaSelect.value !== 'semanal';
}

function definirDiasSelecionadosMed(dias) {
  const conjunto = new Set(dias);
  medDaysGroup.querySelectorAll('.med-day-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(conjunto.has(Number(btn.dataset.day))));
  });
}

function obterDiasSelecionadosMed() {
  if (medFrequenciaSelect.value === 'diario') return [0, 1, 2, 3, 4, 5, 6];
  const selecionados = [];
  medDaysGroup.querySelectorAll('.med-day-btn[aria-pressed="true"]').forEach((btn) => {
    selecionados.push(Number(btn.dataset.day));
  });
  return selecionados.sort((a, b) => a - b);
}

function abrirDetalhesMedicamento(medId) {
  const item = medicamentosCache.get(String(medId));
  if (!item) return;

  editingMedId = String(medId);
  limparErrosMedForm();
  medForm.reset();

  medNomeInput.value = item.medicamento || '';
  medIncluirSalCheckbox.checked = Boolean(item.principioAtivo);
  medPrincipioInput.value = item.principioAtivo || '';
  atualizarSecaoSalMed();

  medFormatoSelect.value = FORMATOS_MED_VALIDOS.has(item.formato) ? item.formato : 'Comprimido';
  medDosagemInput.value = item.dosagem ?? '';
  medUnidadeSelect.value = UNIDADES_MED_VALIDAS.has(item.unidade) ? item.unidade : 'mg';

  const dias = Array.isArray(item.diasDaSemana) ? item.diasDaSemana : [];
  if (dias.length === 7) {
    medFrequenciaSelect.value = 'diario';
    definirDiasSelecionadosMed([]);
  } else {
    medFrequenciaSelect.value = 'semanal';
    definirDiasSelecionadosMed(dias);
  }
  atualizarSecaoDiasMed();

  const horarios = Array.isArray(item.horarios) ? item.horarios : [];
  medSemHorarioCheckbox.checked = horarios.length === 0;
  preencherHorariosMed(horarios);
  atualizarSecaoHorariosMed();

  medInicioInput.value = String(item.dataInicio || '').slice(0, 10);
  medFimInput.value = item.dataFim ? String(item.dataFim).slice(0, 10) : '';

  medDialog.showModal();
  medNomeInput.focus();
}

async function registrarDoseTomadaInicial(card, btn) {
  medActionError.hidden = true;
  const petId = sessionStorage.getItem('activePetId');
  const medId = card.dataset.medId;
  const horario = card.dataset.horario || '';

  btn.disabled = true;
  try {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(medId)}/doses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ horario }),
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroMedAcao(resData.message || 'Erro ao registrar dose.');
      return;
    }

    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroMedAcao('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
}

async function desfazerDoseTomadaInicial(card, btn) {
  medActionError.hidden = true;
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
      mostrarErroMedAcao(resData.message || 'Erro ao desfazer registro da dose.');
      return;
    }

    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroMedAcao('Erro de comunicação com o servidor.');
  } finally {
    btn.disabled = false;
  }
}

medIncluirSalCheckbox.addEventListener('change', () => {
  atualizarSecaoSalMed();
  if (medIncluirSalCheckbox.checked) medPrincipioInput.focus();
});

medFrequenciaSelect.addEventListener('change', atualizarSecaoDiasMed);
medSemHorarioCheckbox.addEventListener('change', atualizarSecaoHorariosMed);

medAddHorarioBtn.addEventListener('click', () => {
  adicionarLinhaHorarioMed('');
  const inputs = medHorariosListEl.querySelectorAll('.med-horario-input');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

medHorariosListEl.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-action="remover-horario"]');
  if (!removeBtn) return;
  const row = removeBtn.closest('.med-horario-row');
  if (row) row.remove();
  atualizarBotaoAddHorarioMed();
});

medDaysGroup.addEventListener('click', (event) => {
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

medCloseBtn.addEventListener('click', () => medDialog.close());
medCancelBtn.addEventListener('click', () => medDialog.close());
medDialog.addEventListener('click', (event) => {
  if (event.target === medDialog) medDialog.close();
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;

  const acao = btn.dataset.action;
  if (acao === 'med-detalhes' && btn.dataset.id) {
    abrirDetalhesMedicamento(btn.dataset.id);
    return;
  }
  if (acao === 'med-tomar') {
    const card = btn.closest('.med-dose-card');
    if (card) registrarDoseTomadaInicial(card, btn);
    return;
  }
  if (acao === 'med-desfazer') {
    const card = btn.closest('.med-dose-card');
    if (card) desfazerDoseTomadaInicial(card, btn);
  }
});

medForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editingMedId) return;
  limparErrosMedForm();

  const medicamento = medNomeInput.value.trim();
  const principioAtivo = medIncluirSalCheckbox.checked ? medPrincipioInput.value.trim() : '';
  const formato = medFormatoSelect.value;
  const dosagemStr = medDosagemInput.value.trim();
  const unidade = medUnidadeSelect.value;
  const diasDaSemana = obterDiasSelecionadosMed();
  const dataInicio = medInicioInput.value;
  const dataFim = medFimInput.value;

  if (medicamento.length < 1 || medicamento.length > 100) {
    mostrarErroMedForm('Informe o nome de farmácia (entre 1 e 100 caracteres).', medNomeInput);
    return;
  }
  if (principioAtivo.length > 100) {
    mostrarErroMedForm('O nome da droga/sal deve ter no máximo 100 caracteres.', medPrincipioInput);
    return;
  }
  if (!FORMATOS_MED_VALIDOS.has(formato)) {
    mostrarErroMedForm('Selecione um formato válido.', medFormatoSelect);
    return;
  }
  const dosagem = Number(dosagemStr);
  if (!dosagemStr || !Number.isFinite(dosagem) || dosagem <= 0) {
    mostrarErroMedForm('A dosagem deve ser um número maior que zero.', medDosagemInput);
    return;
  }
  if (!UNIDADES_MED_VALIDAS.has(unidade)) {
    mostrarErroMedForm('Selecione uma unidade válida.', medUnidadeSelect);
    return;
  }
  if (diasDaSemana.length === 0) {
    mostrarErroMedForm('Escolha pelo menos um dia da semana.');
    return;
  }

  const horarios = [];
  if (!medSemHorarioCheckbox.checked) {
    const inputs = Array.from(medHorariosListEl.querySelectorAll('.med-horario-input'));
    if (inputs.length === 0) {
      mostrarErroMedForm('Adicione pelo menos um horário ou marque "Sem horário".');
      return;
    }
    const vistos = new Set();
    for (const input of inputs) {
      const h = input.value.trim();
      if (!isHorarioValido(h)) {
        mostrarErroMedForm('Preencha todos os horários no formato HH:MM.', input);
        return;
      }
      if (vistos.has(h)) {
        mostrarErroMedForm('Não repita horários iguais.', input);
        return;
      }
      vistos.add(h);
      horarios.push(h);
    }
  }

  if (!isDataRealISO(dataInicio)) {
    mostrarErroMedForm('Informe uma data de início válida.', medInicioInput);
    return;
  }
  if (dataFim) {
    if (!isDataRealISO(dataFim)) {
      mostrarErroMedForm('Informe uma data de fim válida.', medFimInput);
      return;
    }
    if (dataFim < dataInicio) {
      mostrarErroMedForm('A data de fim não pode ser anterior à data de início.', medFimInput);
      return;
    }
  }

  const petId = sessionStorage.getItem('activePetId');
  medSaveBtn.disabled = true;
  medDeleteBtn.disabled = true;
  try {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/medicamentos/${encodeURIComponent(editingMedId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          medicamento,
          principioAtivo,
          formato,
          dosagem,
          unidade,
          diasDaSemana,
          horarios,
          dataInicio,
          dataFim: dataFim || null,
        }),
      }
    );

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroMedForm(resData.message || 'Erro ao salvar medicamento.');
      return;
    }

    medDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroMedForm('Erro de comunicação com o servidor.');
  } finally {
    medSaveBtn.disabled = false;
    medDeleteBtn.disabled = false;
  }
});

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
      mostrarErroMedForm(resData.message || 'Erro ao excluir medicamento.');
      return;
    }

    medDialog.close();
    await carregarPainelDoPet(petId);
  } catch {
    mostrarErroMedForm('Erro de comunicação com o servidor.');
  } finally {
    medSaveBtn.disabled = false;
    medDeleteBtn.disabled = false;
  }
});

// Imagem do Tutor
function renderizarAvatarTutor(user) {
  const link = document.getElementById('tutor-avatar');
  const img = document.getElementById('tutor-avatar-img');
  const initialsEl = document.getElementById('tutor-avatar-initials');
  if (!link || !img || !initialsEl) return;

  const partes = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  const iniciais = partes.length === 0
    ? '?'
    : partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();

  initialsEl.textContent = iniciais;
  const rotulo = user?.name ? `Perfil de ${user.name}` : 'Meu perfil';
  link.title = rotulo;
  link.setAttribute('aria-label', rotulo);

  img.addEventListener('error', () => {
    img.hidden = true;
    initialsEl.hidden = false;
  });

  if (user?.temFoto) {
    img.src = `/api/auth/me/foto?v=${Date.now()}`;
    img.hidden = false;
    initialsEl.hidden = true;
  } else {
    img.hidden = true;
    initialsEl.hidden = false;
  }
}

async function inicializarAplicacao() {
  try {
    // Busca pets e dados do tutor
    const [pets, user] = await Promise.all([
      fetchAPI('/api/pets'),
      fetchAPI('/api/auth/me').catch(() => null),
    ]);

    // Sem pets
    if (pets.length === 0) {
      window.location.href = "cadastro-pet.html";
      return;
    }

    // Caixa dos Pets
    renderizarAvatarTutor(user);
    petListEl.innerHTML = '';

    // Escolher pet
    let activePetId = sessionStorage.getItem('activePetId');
    if (!activePetId || !pets.some(p => p._id === activePetId)) {
      activePetId = pets[0]._id;
      sessionStorage.setItem('activePetId', activePetId);
    }

    // Seletor
    const cacheBust = Date.now();
    pets.forEach(pet => {
      const isActive = pet._id === activePetId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pet-avatar ${isActive ? 'is-active' : ''}`;
      btn.title = pet.nome;
      btn.setAttribute('aria-label', pet.nome);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      // Usa a foto do pet quando existir, com fallback para o ícone de patinha
      if (pet.temFoto) {
        const img = document.createElement('img');
        img.className = 'pet-avatar__img';
        img.src = `/api/pets/${encodeURIComponent(pet._id)}/foto?v=${cacheBust}`;
        img.alt = '';
        img.addEventListener('error', () => {
          btn.innerHTML = pawSvg;
        });
        btn.appendChild(img);
      } else {
        btn.innerHTML = pawSvg;
      }

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
