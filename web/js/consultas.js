/*
* Autoria: Mateus de Souza Campos | RA: 25009935
*/

// Ícones personalizados
const pawSvg = `<span class="icon icon--paw" aria-hidden="true"></span>`;
const calendarSvg = `<span class="icon icon--calendar card__icon" aria-hidden="true"></span>`;
const clockSvg = `<span class="icon icon--clock card__icon" aria-hidden="true"></span>`;
const trashSvg = `<span class="icon icon--trash" aria-hidden="true"></span>`;

// Elementos
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const content = document.getElementById('consultas-content');
const retryBtn = document.getElementById('retry-btn');

const petSubtitle = document.getElementById('pet-subtitle');
const sinceEl = document.getElementById('since');
const petListEl = document.getElementById('pet-list');
const petSwitcherContainer = document.getElementById('pet-switcher-container');

const consultaList = document.getElementById('consulta-list');
const consultasEmpty = document.getElementById('consultas-empty');
const nextList = document.getElementById('next-list');
const nextEmpty = document.getElementById('next-empty');

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const filterToggle = document.getElementById('filter-toggle');
const filterPanel = document.getElementById('filter-panel');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const filterClear = document.getElementById('filter-clear');

// Utilidades
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function formatData(dataISO) {
  if (!dataISO) return '';
  const [y, m, d] = String(dataISO).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function fetchAPI(endpoint) {
  const response = await fetch(endpoint);
  if (response.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Não autorizado');
  }
  if (!response.ok) {
    throw new Error('Erro na requisição');
  }
  return response.json();
}

// Falha ao falar com a API
function falhaAoCarregar() {
  loadingState.hidden = true;
  content.hidden = true;
  errorState.hidden = false;
}

// Renderização
let consultasCache = new Map();
function renderizarConsultas(data) {
  consultasCache = new Map();
  data.historico.forEach((c) => consultasCache.set(String(c._id), { ...c, status: 'realizada' }));
  data.proximas.forEach((c) => consultasCache.set(String(c._id), { ...c, motivo: c.titulo, status: 'agendada' }));

  petSubtitle.textContent = `Histórico de ${data.pet.nome}`;

  // Contador de dias
  const dias = data.diasDesdeUltimaConsulta;
  if (dias === null || dias === undefined) {
    sinceEl.textContent = 'Nenhuma consulta realizada ainda.';
  } else {
    sinceEl.innerHTML = `<strong>${esc(dias)}</strong> ${Number(dias) === 1 ? 'dia' : 'dias'} desde a última consulta`;
  }

  // Histórico
  consultaList.innerHTML = data.historico.map((c) => `
    <article class="card card--brand consulta-card" data-id="${esc(c._id)}" data-date="${esc(String(c.data || '').slice(0, 10))}">
      <h3 class="card__title">${esc(c.motivo || 'Consulta')}</h3>
      <dl class="consulta-info">
        <div><dt>Data:</dt> <dd>${esc(formatData(c.data))}</dd></div>
        <div><dt>Local:</dt> <dd>${esc(c.local)}</dd></div>
        <div><dt>Médico responsável:</dt> <dd>${esc(c.medico)}</dd></div>
        ${c.diagnostico ? `<div><dt>Diagnóstico:</dt> <dd>${esc(c.diagnostico)}</dd></div>` : ''}
        ${c.observacoes ? `<div><dt>Observações:</dt> <dd>${esc(c.observacoes)}</dd></div>` : ''}
      </dl>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
        <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(c._id)}">Ver detalhes</button>
      </div>
    </article>`).join('');


  // Próximas consultas (a de hoje fica em destaque, mas com a mesma estrutura dos demais)
  const hoje = new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD
  nextList.innerHTML = data.proximas.map((c) => {
    const dataISO = String(c.data || '').slice(0, 10);
    const ehHoje = dataISO === hoje;
    if (ehHoje) {
      return `
    <article class="card card--warning" data-id="${esc(c._id)}" data-date="${esc(dataISO)}">
      <div class="card__row">
        ${clockSvg}
        <div class="card__main">
          <span class="card__label">Hoje</span>
          <h3 class="card__title">${esc(c.titulo)}</h3>
        </div>
      </div>
      <p class="card__meta">Data: ${esc(formatData(c.data))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
        <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(c._id)}">Ver detalhes</button>
      </div>
    </article>`;
    }
    return `
    <article class="card card--neutral" data-id="${esc(c._id)}" data-date="${esc(dataISO)}">
      <div class="card__row">
        ${calendarSvg}
        <h3 class="card__title">${esc(c.titulo)}</h3>
      </div>
      <p class="card__meta">Data esperada: ${esc(formatData(c.data))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
        <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(c._id)}">Ver detalhes</button>
      </div>
    </article>`;
  }).join('');


  nextEmpty.hidden = data.proximas.length > 0;

  // Novo pet = busca e filtros zerados
  searchInput.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  applyFilters();
}

// Busca e filtro por data
function applyFilters() {
  const cards = consultaList.querySelectorAll('.consulta-card');
  const query = normalize(searchInput.value.trim());
  const from = dateFrom.value; // AAAA-MM-DD
  const to = dateTo.value;
  const filtering = Boolean(query || from || to);
  let visible = 0;

  cards.forEach((card) => {
    let match = !query || normalize(card.textContent).includes(query);

    if (match && (from || to)) {
      const date = card.dataset.date;
      match = Boolean(date) && (!from || date >= from) && (!to || date <= to);
    }

    card.hidden = !match;
    if (match) visible += 1;
  });

  consultasEmpty.textContent = filtering && cards.length > 0
    ? 'Nenhuma consulta encontrada.'
    : 'Nenhuma consulta registrada.';
  consultasEmpty.hidden = visible > 0;
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applyFilters();
});

filterToggle.addEventListener('click', () => {
  const opening = filterPanel.hidden;
  filterPanel.hidden = !opening;
  filterToggle.setAttribute('aria-expanded', String(opening));
});

dateFrom.addEventListener('change', applyFilters);
dateTo.addEventListener('change', applyFilters);

filterClear.addEventListener('click', () => {
  dateFrom.value = '';
  dateTo.value = '';
  applyFilters();
});

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

// só deixa abrir links do próprio site ou com https
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

// botão Documentos
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

// clique fora da caixa fecha
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
  } catch (error) {
    showDocError('Erro de comunicação com o servidor.');
  } finally {
    docSubmit.disabled = false;
  }
});

// Marcar consulta
const scheduleBtn = document.getElementById('schedule-btn');
const scheduleDialog = document.getElementById('schedule-dialog');
const scheduleClose = document.getElementById('schedule-close');
const scheduleForm = document.getElementById('schedule-form');
const scheduleError = document.getElementById('schedule-error');
const scheduleSubmit = document.getElementById('schedule-submit');
const consultaDataInput = document.getElementById('consulta-data');
const consultaHorarioInput = document.getElementById('consulta-horario');
const realizadaFields = document.getElementById('realizada-fields');

function getEm24Horas() {
  const futuro = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const data = futuro.toLocaleDateString('en-CA'); // AAAA-MM-DD
  const horario = futuro.toTimeString().slice(0, 5); // HH:MM
  return { data, horario };
}

function atualizarCamposRealizada() {
  const agora = new Date();
  const hojeStr = agora.toLocaleDateString('en-CA');
  const horaStr = agora.toTimeString().slice(0, 5);
  const d = consultaDataInput.value;
  const h = consultaHorarioInput.value || '00:00';
  const ehPassadoOuAgora = Boolean(d) && (d < hojeStr || (d === hojeStr && h <= horaStr));
  realizadaFields.hidden = !ehPassadoOuAgora;
}

function abrirModalConsulta({ motivo = '', data = '', horario = '' } = {}) {
  scheduleError.hidden = true;
  scheduleForm.reset();

  const padrao24h = getEm24Horas();
  document.getElementById('consulta-motivo').value = motivo;
  consultaDataInput.value = data || padrao24h.data;
  consultaHorarioInput.value = horario || padrao24h.horario;

  atualizarCamposRealizada();
  scheduleDialog.showModal();
}

consultaDataInput.addEventListener('change', atualizarCamposRealizada);
consultaHorarioInput.addEventListener('change', atualizarCamposRealizada);

scheduleBtn.addEventListener('click', () => abrirModalConsulta());
scheduleClose.addEventListener('click', () => scheduleDialog.close());

scheduleDialog.addEventListener('click', (event) => {
  if (event.target === scheduleDialog) scheduleDialog.close();
});

nextList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="agendar-card"]');
  if (!btn) return;
  abrirModalConsulta({
    motivo: btn.dataset.titulo,
    data: btn.dataset.data,
    horario: btn.dataset.horario
  });
});

scheduleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  scheduleError.hidden = true;

  const petId = sessionStorage.getItem('activePetId');
  const payload = {
    motivo: document.getElementById('consulta-motivo').value.trim(),
    data: consultaDataInput.value,
    horario: consultaHorarioInput.value,
    local: document.getElementById('consulta-local').value.trim(),
    veterinario: document.getElementById('consulta-vet').value.trim(),
    diagnostico: document.getElementById('consulta-diagnostico').value.trim(),
    observacoes: document.getElementById('consulta-obs').value.trim()
  };

  scheduleSubmit.disabled = true;
  try {
    const response = await fetch(`/api/pets/${petId}/consultas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      scheduleError.textContent = resData.message || 'Erro ao salvar consulta.';
      scheduleError.hidden = false;
      return;
    }

    scheduleDialog.close();
    await carregarConsultasDoPet(petId);
  } catch {
    scheduleError.textContent = 'Erro de comunicação com o servidor.';
    scheduleError.hidden = false;
  } finally {
    scheduleSubmit.disabled = false;
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
    await carregarConsultasDoPet(petId);
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
    await carregarConsultasDoPet(petId);
  } catch {
    detailError.textContent = 'Erro de comunicação com o servidor.';
    detailError.hidden = false;
  } finally {
    detailDeleteBtn.disabled = false;
  }
});

// Carregamento
async function carregarConsultasDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  try {
    const data = await fetchAPI(`/api/pets/${petId}/consultas`);
    renderizarConsultas(data);

    loadingState.hidden = true;
    content.hidden = false;
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

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

    // Mesmo pet ativo da tela inicial (guardado na sessão)
    let activePetId = sessionStorage.getItem('activePetId');
    if (!activePetId || !pets.some((p) => p._id === activePetId)) {
      activePetId = pets[0]._id;
      sessionStorage.setItem('activePetId', activePetId);
    }

    const cacheBust = Date.now();
    pets.forEach((pet) => {
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
        if (pet._id === sessionStorage.getItem('activePetId')) return;
        sessionStorage.setItem('activePetId', pet._id);

        document.querySelectorAll('.pet-avatar').forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');

        carregarConsultasDoPet(pet._id);
      });

      petListEl.appendChild(btn);
    });

    await carregarConsultasDoPet(activePetId);
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

retryBtn.addEventListener('click', () => location.reload());
inicializarAplicacao();
