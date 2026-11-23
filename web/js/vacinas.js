/*
* Autoria: Giovanni Joseppe Bozelli
* RA: 25006837
*/

// Ícones personalizados
const pawSvg = `<span class="icon icon--paw" aria-hidden="true"></span>`;
const calendarSvg = `<span class="icon icon--calendar card__icon" aria-hidden="true"></span>`;
const clockSvg = `<span class="icon icon--clock card__icon" aria-hidden="true"></span>`;
const alertSvg = `<span class="icon icon--alert card__icon" aria-hidden="true"></span>`;
const trashSvg = `<span class="icon icon--trash" aria-hidden="true"></span>`;

// Elementos
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const content = document.getElementById('vacinas-content');
const retryBtn = document.getElementById('retry-btn');

const petSubtitle = document.getElementById('pet-subtitle');
const resumoEl = document.getElementById('resumo');
const registerBtn = document.getElementById('register-btn');
const petListEl = document.getElementById('pet-list');

const vacinaList = document.getElementById('vacina-list');
const vacinasEmpty = document.getElementById('vacinas-empty');
const nextList = document.getElementById('next-list');
const nextEmpty = document.getElementById('next-empty');

// Utilidades
// Evita que texto vindo do banco seja interpretado como HTML
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// Data ISO para BR
function formatData(dataISO) {
  if (!dataISO) return '';
  const [y, m, d] = String(dataISO).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function getHojeISO() {
  return new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD
}

// Diferença em dias
function diffDiasAte(dataAlvoISO) {
  if (!dataAlvoISO) return null;
  const [y1, m1, d1] = getHojeISO().split('-').map(Number);
  const [y2, m2, d2] = String(dataAlvoISO).slice(0, 10).split('-').map(Number);
  const utcHoje = Date.UTC(y1, m1 - 1, d1);
  const utcAlvo = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utcAlvo - utcHoje) / 86400000);
}

// atrasada
function classificarProxima(dataISO) {
  const dias = diffDiasAte(dataISO);
  if (dias === null) return 'proxima';
  if (dias < 0) return 'atrasada';
  if (dias <= 7) return 'limite';
  return 'proxima';
}

function tituloComDose(titulo, dose) {
  const base = titulo || 'Vacina';
  return dose ? `${base} · ${dose}` : base;
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

// Renderização
let vacinasCache = new Map();

function renderizarResumo(aplicadas, proximas) {
  if (aplicadas.length === 0 && proximas.length === 0) {
    resumoEl.textContent = 'Nenhuma vacina registrada ainda.';
    return;
  }

  let atrasadas = 0;
  let noLimite = 0;
  let agendadas = 0;

  proximas.forEach((v) => {
    const situacao = classificarProxima(v.proximaDose || v.data);
    if (situacao === 'atrasada') atrasadas += 1;
    else if (situacao === 'limite') noLimite += 1;
    else agendadas += 1;
  });

  const partes = [
    `<strong>${esc(aplicadas.length)}</strong> ${aplicadas.length === 1 ? 'aplicada' : 'aplicadas'}`
  ];

  if (atrasadas > 0) {
    partes.push(`<strong>${esc(atrasadas)}</strong> ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`);
  }
  if (noLimite > 0) {
    partes.push(`<strong>${esc(noLimite)}</strong> no limite`);
  }
  if (agendadas > 0 && atrasadas === 0 && noLimite === 0) {
    partes.push(`<strong>${esc(agendadas)}</strong> ${agendadas === 1 ? 'agendada' : 'agendadas'}`);
  }

  resumoEl.innerHTML = partes.join(' · ');
}

function renderizarVacinas(data) {

  const aplicadas = Array.isArray(data.aplicadas) ? data.aplicadas : [];
  const proximas = Array.isArray(data.proximas) ? data.proximas : [];

  vacinasCache = new Map();
  aplicadas.forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'aplicada' }));
  proximas.forEach((v) => vacinasCache.set(String(v._id), { ...v, status: 'pendente' }));

  petSubtitle.textContent = `Carteira de ${data.pet.nome}`;
  renderizarResumo(aplicadas, proximas);

  // Vacinas aplicadas
  vacinaList.innerHTML = aplicadas.map((v) => {
    const dataISO = String(v.dataAplicacao || '').slice(0, 10);
    return `
    <article class="card card--brand vacina-card" data-id="${esc(v._id)}" data-date="${esc(dataISO)}">
      <h3 class="card__title">${esc(tituloComDose(v.titulo, v.dose))}</h3>
      <dl class="vacina-info">
        <div><dt>Data aplicada:</dt> <dd>${esc(formatData(dataISO))}</dd></div>
        <div><dt>Local da aplicação:</dt> <dd>${esc(v.local || 'Não informado')}</dd></div>
        <div><dt>Médico responsável:</dt> <dd>${esc(v.veterinario || 'Não informado')}</dd></div>
      </dl>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="documentos">Documentos</button>
        <button type="button" class="btn btn--sm" data-action="detalhes" data-id="${esc(v._id)}">Ver detalhes</button>
      </div>
    </article>`;
  }).join('');

  vacinasEmpty.hidden = aplicadas.length > 0;

  // Próximas vacinas
  nextList.innerHTML = proximas.map((v) => {
    const dataISO = String(v.proximaDose || v.data || '').slice(0, 10);
    const situacao = classificarProxima(dataISO);
    const titulo = tituloComDose(v.titulo, v.dose);

    if (situacao === 'atrasada') {
      return `
    <article class="card card--danger" data-id="${esc(v._id)}" data-date="${esc(dataISO)}">
      <div class="card__row">
        ${alertSvg}
        <div class="card__main">
          <span class="card__label">Atrasada</span>
          <h3 class="card__title">${esc(titulo)}</h3>
        </div>
      </div>
      <p class="card__meta">Data esperada: ${esc(formatData(dataISO))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="detalhes" data-id="${esc(v._id)}">Ver detalhes</button>
        <button type="button" class="btn btn--sm" data-action="aplicar" data-id="${esc(v._id)}">Marcar como aplicada</button>
      </div>
    </article>`;
    }

    if (situacao === 'limite') {
      return `
    <article class="card card--warning" data-id="${esc(v._id)}" data-date="${esc(dataISO)}">
      <div class="card__row">
        ${clockSvg}
        <div class="card__main">
          <span class="card__label">No limite</span>
          <h3 class="card__title">${esc(titulo)}</h3>
        </div>
      </div>
      <p class="card__meta">Data esperada: ${esc(formatData(dataISO))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="detalhes" data-id="${esc(v._id)}">Ver detalhes</button>
        <button type="button" class="btn btn--sm" data-action="aplicar" data-id="${esc(v._id)}">Marcar como aplicada</button>
      </div>
    </article>`;
    }

    return `
    <article class="card card--neutral" data-id="${esc(v._id)}" data-date="${esc(dataISO)}">
      <div class="card__row">
        ${calendarSvg}
        <h3 class="card__title">${esc(titulo)}</h3>
      </div>
      <p class="card__meta">Data esperada: ${esc(formatData(dataISO))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--sm btn--outline" data-action="detalhes" data-id="${esc(v._id)}">Ver detalhes</button>
        <button type="button" class="btn btn--sm" data-action="aplicar" data-id="${esc(v._id)}">Marcar como aplicada</button>
      </div>
    </article>`;
  }).join('');

  nextEmpty.hidden = proximas.length > 0;
}

// Documentos da vacina
const docDialog = document.getElementById('doc-dialog');
const docSubtitle = document.getElementById('doc-subtitle');
const docStatus = document.getElementById('doc-status');
const docList = document.getElementById('doc-list');
const docForm = document.getElementById('doc-form');
const docFile = document.getElementById('doc-file');
const docError = document.getElementById('doc-error');
const docSubmit = document.getElementById('doc-submit');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
let currentVacinaId = null;

function docsEndpoint() {
  return `/api/pets/${sessionStorage.getItem('activePetId')}/vacinas/${currentVacinaId}/documentos`;
}

function showDocError(message) {
  docError.textContent = message;
  docError.hidden = false;
}

// Só deixa abrir links do próprio site ou http(s)
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
  currentVacinaId = card.dataset.id;

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

// Detalhes de Vacina
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
const tituloInput = document.getElementById('vacina-titulo');
const doseSelect = document.getElementById('vacina-dose');
const appliedFields = document.getElementById('applied-fields');
const pendingFields = document.getElementById('pending-fields');
const pendingStatusPreview = document.getElementById('pending-status-preview');
const dataAplicacaoInput = document.getElementById('vacina-data-aplicacao');
const loteInput = document.getElementById('vacina-lote');
const fabricanteInput = document.getElementById('vacina-fabricante');
const proximaDoseLabel = document.getElementById('proxima-dose-label');
const proximaDoseInput = document.getElementById('vacina-proxima-dose');
const proximaDoseHint = document.getElementById('proxima-dose-hint');
const localInput = document.getElementById('vacina-local');
const localLabel = document.querySelector('label[for="vacina-local"]');
const veterinarioInput = document.getElementById('vacina-veterinario');
const veterinarioLabel = document.querySelector('label[for="vacina-veterinario"]');
const obsInput = document.getElementById('vacina-obs');

let editingVacinaId = null;

function getStatusSelecionado() {
  return statusPendenteRadio.checked ? 'pendente' : 'aplicada';
}

function limparErrosFormulario() {
  vaccineError.hidden = true;
  vaccineForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
  });
}

function mostrarErroFormulario(mensagem, campo) {
  vaccineError.textContent = mensagem;
  vaccineError.hidden = false;
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function atualizarPreviewPendente() {
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

function atualizarModoFormulario() {
  const ehPendente = getStatusSelecionado() === 'pendente';

  appliedFields.hidden = ehPendente;
  pendingFields.hidden = !ehPendente;

  dataAplicacaoInput.required = !ehPendente;
  proximaDoseInput.required = ehPendente;
  localInput.required = !ehPendente;
  veterinarioInput.required = !ehPendente;

  if (ehPendente) {
    proximaDoseLabel.textContent = 'Data esperada';
    proximaDoseHint.textContent = 'Data prevista para aplicar esta dose no pet.';
    localLabel.innerHTML = 'Clínica / Local <span class="optional">(opcional)</span>';
    veterinarioLabel.innerHTML = 'Médico veterinário <span class="optional">(opcional)</span>';
    atualizarPreviewPendente();
  } else {
    proximaDoseLabel.innerHTML = 'Próxima dose <span class="optional">(opcional)</span>';
    proximaDoseHint.textContent = 'Data prevista para o próximo reforço (apenas para controle).';
    localLabel.textContent = 'Clínica / Local';
    veterinarioLabel.textContent = 'Médico veterinário';
    dataAplicacaoInput.max = getHojeISO();
  }
}

function abrirModalCadastro() {
  editingVacinaId = null;
  limparErrosFormulario();
  vaccineForm.reset();

  vaccineTitle.textContent = 'Registrar vacina';
  vaccineSubtitle.textContent = 'Preencha os dados da dose aplicada ou agendada para o pet.';
  vaccineSaveBtn.textContent = 'Salvar';
  vaccineDeleteBtn.hidden = true;

  statusAplicadaRadio.checked = true;
  dataAplicacaoInput.value = getHojeISO();
  atualizarModoFormulario();
  vaccineDialog.showModal();
  tituloInput.focus();
}

function abrirDetalhesVacina(vacinaId) {
  const item = vacinasCache.get(String(vacinaId));
  if (!item) return;

  editingVacinaId = String(vacinaId);
  limparErrosFormulario();
  vaccineForm.reset();

  const ehPendente = item.status === 'pendente';
  vaccineTitle.textContent = 'Detalhes da vacina';
  vaccineSubtitle.textContent = ehPendente ? 'Situação: Dose agendada' : 'Situação: Vacina aplicada';
  vaccineSaveBtn.textContent = 'Salvar alterações';
  vaccineDeleteBtn.hidden = false;

  statusAplicadaRadio.checked = !ehPendente;
  statusPendenteRadio.checked = ehPendente;

  tituloInput.value = item.titulo || '';
  doseSelect.value = item.dose || '';
  dataAplicacaoInput.value = String(item.dataAplicacao || '').slice(0, 10);
  proximaDoseInput.value = String(item.proximaDose || item.data || '').slice(0, 10);
  loteInput.value = item.lote || '';
  fabricanteInput.value = item.fabricante || '';
  localInput.value = item.local || '';
  veterinarioInput.value = item.veterinario || '';
  obsInput.value = item.observacoes || '';

  atualizarModoFormulario();
  vaccineDialog.showModal();
}

function abrirMarcarAplicada(vacinaId) {
  const item = vacinasCache.get(String(vacinaId));
  if (!item) return;

  editingVacinaId = String(vacinaId);
  limparErrosFormulario();
  vaccineForm.reset();

  vaccineTitle.textContent = 'Marcar como aplicada';
  vaccineSubtitle.textContent = 'Confirme os dados da aplicação desta dose.';
  vaccineSaveBtn.textContent = 'Confirmar aplicação';
  vaccineDeleteBtn.hidden = false;

  statusAplicadaRadio.checked = true;
  tituloInput.value = item.titulo || '';
  doseSelect.value = item.dose || '';
  dataAplicacaoInput.value = getHojeISO();
  proximaDoseInput.value = '';
  loteInput.value = item.lote || '';
  fabricanteInput.value = item.fabricante || '';
  localInput.value = item.local || '';
  veterinarioInput.value = item.veterinario || '';
  obsInput.value = item.observacoes || '';

  atualizarModoFormulario();
  vaccineDialog.showModal();
  localInput.focus();
}

statusAplicadaRadio.addEventListener('change', () => {
  limparErrosFormulario();
  if (!dataAplicacaoInput.value) dataAplicacaoInput.value = getHojeISO();
  atualizarModoFormulario();
});

statusPendenteRadio.addEventListener('change', () => {
  limparErrosFormulario();
  atualizarModoFormulario();
});

proximaDoseInput.addEventListener('change', () => {
  if (getStatusSelecionado() === 'pendente') atualizarPreviewPendente();
});

vaccineForm.addEventListener('input', (event) => {
  if (event.target.getAttribute('aria-invalid') === 'true') {
    event.target.removeAttribute('aria-invalid');
  }
});

registerBtn.addEventListener('click', abrirModalCadastro);
vaccineClose.addEventListener('click', () => vaccineDialog.close());

vaccineDialog.addEventListener('click', (event) => {
  if (event.target === vaccineDialog) vaccineDialog.close();
});

document.addEventListener('click', (event) => {
  const detalheBtn = event.target.closest('[data-action="detalhes"]');
  if (detalheBtn && detalheBtn.dataset.id) {
    abrirDetalhesVacina(detalheBtn.dataset.id);
    return;
  }

  const aplicarBtn = event.target.closest('[data-action="aplicar"]');
  if (aplicarBtn && aplicarBtn.dataset.id) {
    abrirMarcarAplicada(aplicarBtn.dataset.id);
  }
});

vaccineForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparErrosFormulario();

  const status = getStatusSelecionado();
  const titulo = tituloInput.value.trim();
  const dose = doseSelect.value;
  const dataAplicacao = dataAplicacaoInput.value;
  const proximaDose = proximaDoseInput.value;
  const lote = loteInput.value.trim();
  const fabricante = fabricanteInput.value.trim();
  const local = localInput.value.trim();
  const veterinario = veterinarioInput.value.trim();
  const observacoes = obsInput.value.trim();
  const hoje = getHojeISO();

  if (titulo.length < 2) {
    mostrarErroFormulario('Informe o nome da vacina.', tituloInput);
    return;
  }
  if (!dose) {
    mostrarErroFormulario('Selecione a dose.', doseSelect);
    return;
  }

  if (status === 'aplicada') {
    if (!dataAplicacao) {
      mostrarErroFormulario('Informe a data da aplicação.', dataAplicacaoInput);
      return;
    }
    if (dataAplicacao > hoje) {
      mostrarErroFormulario('A data da aplicação não pode estar no futuro.', dataAplicacaoInput);
      return;
    }
    if (proximaDose && proximaDose < dataAplicacao) {
      mostrarErroFormulario('A próxima dose não pode ser anterior à data da aplicação.', proximaDoseInput);
      return;
    }
    if (local.length < 2) {
      mostrarErroFormulario('Informe a clínica ou o local da aplicação.', localInput);
      return;
    }
    if (veterinario.length < 2) {
      mostrarErroFormulario('Informe o médico veterinário responsável.', veterinarioInput);
      return;
    }
  } else {
    if (!proximaDose) {
      mostrarErroFormulario('Informe a data esperada para agendar a dose.', proximaDoseInput);
      return;
    }
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
    observacoes
  };

  const url = editingVacinaId
    ? `/api/pets/${petId}/vacinas/${editingVacinaId}`
    : `/api/pets/${petId}/vacinas`;
  const method = editingVacinaId ? 'PUT' : 'POST';

  vaccineSaveBtn.disabled = true;
  try {
    const response = await fetch(url, {
      method,
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
      mostrarErroFormulario(resData.message || 'Erro ao salvar vacina.');
      return;
    }

    vaccineDialog.close();
    await carregarVacinasDoPet(petId);
  } catch {
    mostrarErroFormulario('Erro de comunicação com o servidor.');
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
      credentials: 'same-origin'
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErroFormulario(resData.message || 'Erro ao excluir vacina.');
      return;
    }

    vaccineDialog.close();
    await carregarVacinasDoPet(petId);
  } catch {
    mostrarErroFormulario('Erro de comunicação com o servidor.');
  } finally {
    vaccineDeleteBtn.disabled = false;
  }
});

// Carregamento
async function carregarVacinasDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  try {
    const data = await fetchAPI(`/api/pets/${petId}/vacinas`);
    renderizarVacinas(data);

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

    // Mesmo pet ativo da tela inicial e de consultas
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

        carregarVacinasDoPet(pet._id);
      });

      petListEl.appendChild(btn);
    });

    await carregarVacinasDoPet(activePetId);
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

retryBtn.addEventListener('click', () => location.reload());
inicializarAplicacao();