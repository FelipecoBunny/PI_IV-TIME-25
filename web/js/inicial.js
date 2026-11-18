/*
* Autoria: Mateus de Souza Campos | RA: 25009935
* Integração e Lógica: Felipe Nasser Coelho Moussa | RA: 25004922
*/

const pawSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2" ry="2.8" /><ellipse cx="10" cy="5.8" rx="2" ry="2.8" /><ellipse cx="14" cy="5.8" rx="2" ry="2.8" /><ellipse cx="18" cy="10" rx="2" ry="2.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.4 0 1.6 1.3 2.6 2.9 2.6 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.6 0 2.9-1 2.9-2.6C17.5 14 15 11 12 11z" /></svg>`;

const calendarSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>`;

const clockSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>`;

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

async function carregarPainelDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  painelContent.hidden = true;

  try {
    const [data, consultasData] = await Promise.all([
      fetchAPI(`/api/pets/${petId}/dashboard`),
      fetchAPI(`/api/pets/${petId}/consultas`),
    ]);

    consultasCache = new Map();
    consultasData.historico.forEach((c) => consultasCache.set(String(c._id), { ...c, status: 'realizada' }));
    consultasData.proximas.forEach((c) => consultasCache.set(String(c._id), { ...c, motivo: c.titulo, status: 'agendada' }));

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

  // Renderiza Hoje (Consultas)
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
      const ehConsulta = consultasCache.has(String(item.id));
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

  // Renderiza Atrasados
  sections.late.list.innerHTML = '';
  if (data.atrasados.length === 0) {
    sections.late.empty.hidden = false;
  } else {
    sections.late.empty.hidden = true;
    data.atrasados.forEach(item => {
      sections.late.list.innerHTML += `
        <article class="card card--danger">
          <div class="card__row">
            <svg class="card__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3 1.5 21h21L12 3zm0 6 6.9 12H5.1L12 9zm-1 3v4h2v-4h-2zm0 5v2h2v-2h-2z" />
            </svg>
            <h3 class="card__title">${esc(item.titulo)}</h3>
          </div>
          <p class="card__meta">${esc(formatData(item.data))}</p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
          </div>
        </article>`;
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