/*
* Autoria: Mateus de Souza Campos | RA: 25009935
*/

const pawSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2" ry="2.8" /><ellipse cx="10" cy="5.8" rx="2" ry="2.8" /><ellipse cx="14" cy="5.8" rx="2" ry="2.8" /><ellipse cx="18" cy="10" rx="2" ry="2.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.4 0 1.6 1.3 2.6 2.9 2.6 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.6 0 2.9-1 2.9-2.6C17.5 14 15 11 12 11z" /></svg>`;

const calendarSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>`;

const clockSvg = `<svg class="card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>`;

// Enquanto não há backend, deixe false: se a API falhar, a tela aparece vazia, sem mensagem de erro.
// Com o backend pronto, mude para true para mostrar "Ocorreu um erro ao carregar as consultas".
const MOSTRAR_ERROS = false;

// ---------- Elementos ----------
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

// ---------- Utilidades ----------
// Evita que texto vindo do banco seja interpretado como HTML
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// "2026-11-04" (ou "2026-11-04T10:00:00Z") -> "04/11/2026"
function formatData(dataISO) {
  if (!dataISO) return '';
  const [y, m, d] = String(dataISO).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// remove acentos e maiúsculas para a busca não depender deles
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

  if (MOSTRAR_ERROS) {
    content.hidden = true;
    errorState.hidden = false;
    return;
  }

  // Sem backend: mostra a tela vazia (cards em branco e mensagens de "nenhuma consulta")
  content.hidden = false;
}

// ---------- Renderização ----------
function renderizarConsultas(data) {
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
        <div><dt>Data:</dt><dd>${esc(formatData(c.data))}</dd></div>
        <div><dt>Local:</dt><dd>${esc(c.local)}</dd></div>
        <div><dt>Médico responsável:</dt><dd>${esc(c.medico)}</dd></div>
      </dl>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
        <button type="button" class="btn btn--sm" disabled>Ver detalhes</button>
      </div>
    </article>`).join('');

  // Próximas consultas (a de hoje fica em destaque)
  const hoje = new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD
  nextList.innerHTML = data.proximas.map((c) => {
    const ehHoje = String(c.data || '').slice(0, 10) === hoje;
    if (ehHoje) {
      return `
    <article class="card card--warning">
      <div class="card__row">
        ${clockSvg}
        <div class="card__main">
          <span class="card__label">Hoje</span>
          <h3 class="card__title">${esc(c.titulo)}</h3>
          <p class="card__meta">Data: ${esc(formatData(c.data))}</p>
        </div>
        <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
      </div>
    </article>`;
    }
    return `
    <article class="card card--neutral">
      <div class="card__row">
        ${calendarSvg}
        <h3 class="card__title">${esc(c.titulo)}</h3>
      </div>
      <p class="card__meta">Data esperada: ${esc(formatData(c.data))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
        <button type="button" class="btn btn--sm" disabled>Marcar consulta</button>
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

// ---------- Busca e filtro por data ----------
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

// ---------- Documentos da consulta ----------
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

// só deixa abrir links do próprio site ou http(s)
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

// botão "Documentos" de cada card (os cards são criados pelo JS, por isso delegação)
consultaList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="documentos"]');
  if (!btn) return;

  const card = btn.closest('.consulta-card');
  if (!card.dataset.id) return; // card em branco (ainda sem dados do banco)
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

// ---------- Carregamento ----------
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

async function inicializarAplicacao() {
  try {
    const pets = await fetchAPI('/api/pets');

    if (pets.length === 0) {
      window.location.href = 'cadastro-pet.html';
      return;
    }

    // Seletor só aparece com mais de um pet
    petSwitcherContainer.style.display = pets.length === 1 ? 'none' : 'flex';
    petListEl.innerHTML = '';

    // Mesmo pet ativo da tela inicial (guardado na sessão)
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
