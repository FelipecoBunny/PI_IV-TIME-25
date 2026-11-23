/*
* Autoria: Maria Júlia Souza de Oliveira
* RA: 25007909
*/

// Estados da página
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const content = document.getElementById('pet-content');

// Topo do pet
const avatarImg = document.getElementById('pet-avatar-img');
const avatarIcon = document.getElementById('pet-avatar-icon');
const petTitleNameEl = document.getElementById('pet-title-name');
const petSubtitleEl = document.getElementById('pet-subtitle');

// Formulário de dados
const petForm = document.getElementById('pet-form');
const petError = document.getElementById('pet-error');
const petSuccess = document.getElementById('pet-success');
const nameInput = document.getElementById('pet-name');
const speciesSelect = document.getElementById('pet-species');
const breedInput = document.getElementById('pet-breed');
const birthInput = document.getElementById('pet-birth');
const sexSelect = document.getElementById('pet-sex');
const weightInput = document.getElementById('pet-weight');
const lengthInput = document.getElementById('pet-length');
const heightInput = document.getElementById('pet-height');
const petSaveBtn = document.getElementById('pet-save');

// Formulário de foto
const photoForm = document.getElementById('photo-form');
const photoError = document.getElementById('photo-error');
const photoSuccess = document.getElementById('photo-success');
const photoInput = document.getElementById('photo-input');
const photoSaveBtn = document.getElementById('photo-save');
const photoRemoveBtn = document.getElementById('photo-remove');

// Exclusão do pet
const deletePetBtn = document.getElementById('delete-pet-btn');
const deleteDialog = document.getElementById('delete-dialog');
const deleteCloseBtn = document.getElementById('delete-close');
const deleteCancelBtn = document.getElementById('delete-cancel');
const deleteForm = document.getElementById('delete-form');
const deleteError = document.getElementById('delete-error');
const deleteConfirmLabel = document.getElementById('delete-confirm-label');
const deleteConfirmInput = document.getElementById('delete-confirm-name');
const deleteSubmitBtn = document.getElementById('delete-submit');

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ESPECIES_VALIDAS = new Set(['cachorro', 'gato', 'outro']);
const SEXOS_VALIDOS = new Set(['femea', 'macho']);
const ESPECIE_LABEL = { cachorro: 'Cachorro', gato: 'Gato', outro: 'Outro' };

const params = new URLSearchParams(window.location.search);
const petId = (params.get('petId') || '').trim();
let currentPet = null;

// Utilidades
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getHojeISO() {
  // O locale en-CA formata a data local diretamente como YYYY-MM-DD
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

function limparMensagens(errorBox, successBox, formEl) {
  if (errorBox) errorBox.hidden = true;
  if (successBox) successBox.hidden = true;
  if (formEl) {
    formEl.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
      el.removeAttribute('aria-invalid');
    });
  }
}

function mostrarErro(errorBox, mensagem, campo) {
  errorBox.textContent = mensagem;
  errorBox.hidden = false;
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function mostrarSucesso(successBox, mensagem) {
  successBox.textContent = mensagem;
  successBox.hidden = false;
}

function mostrarEstadoErro(mensagem, permitirTentarNovamente) {
  loadingState.hidden = true;
  content.hidden = true;
  errorMessageEl.textContent = mensagem;
  retryBtn.hidden = !permitirTentarNovamente;
  errorState.hidden = false;
}

async function fetchAPI(endpoint) {
  const response = await fetch(endpoint, { credentials: 'same-origin' });
  if (response.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Não autorizado');
  }
  if (!response.ok) {
    const err = new Error('Erro na requisição');
    err.status = response.status;
    throw err;
  }
  return response.json();
}

// Avatar
function atualizarAvatar(temFoto) {
  if (temFoto) {
    avatarImg.src = `/api/pets/${encodeURIComponent(petId)}/foto?v=${Date.now()}`;
    avatarImg.hidden = false;
    avatarIcon.hidden = true;
    photoRemoveBtn.hidden = false;
  } else {
    avatarImg.hidden = true;
    avatarImg.removeAttribute('src');
    avatarIcon.hidden = false;
    photoRemoveBtn.hidden = true;
  }
}

avatarImg.addEventListener('error', () => {
  avatarImg.hidden = true;
  avatarIcon.hidden = false;
});

// Renderização
function renderizarPet(pet) {
  currentPet = pet;

  const especieNorm = String(pet.especie || '').trim().toLowerCase();
  const especieTexto = ESPECIE_LABEL[especieNorm] || pet.especie || 'Pet';

  petTitleNameEl.textContent = pet.nome || '';
  petSubtitleEl.textContent = pet.raca ? `${especieTexto} · ${pet.raca}` : especieTexto;
  document.title = `${pet.nome || 'Editar pet'} | PetHealth`;

  nameInput.value = pet.nome || '';
  speciesSelect.value = ESPECIES_VALIDAS.has(especieNorm) ? especieNorm : '';
  breedInput.value = pet.raca || '';
  birthInput.max = getHojeISO();
  birthInput.value = String(pet.dataNascimento || '').slice(0, 10);
  sexSelect.value = SEXOS_VALIDOS.has(pet.sexo) ? pet.sexo : '';
  weightInput.value = pet.peso ?? '';
  lengthInput.value = pet.comprimentoCm ?? '';
  heightInput.value = pet.alturaCm ?? '';

  atualizarAvatar(Boolean(pet.temFoto));
}

document.addEventListener('input', (event) => {
  if (event.target.getAttribute && event.target.getAttribute('aria-invalid') === 'true') {
    event.target.removeAttribute('aria-invalid');
  }
});

// Salvar dados do pet
petForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparMensagens(petError, petSuccess, petForm);

  const nome = nameInput.value.trim();
  const especie = speciesSelect.value;
  const raca = breedInput.value.trim();
  const dataNascimento = birthInput.value;
  const sexo = sexSelect.value;
  const pesoStr = weightInput.value.trim();
  const comprimentoStr = lengthInput.value.trim();
  const alturaStr = heightInput.value.trim();

  if (nome.length < 1 || nome.length > 50) {
    mostrarErro(petError, 'Nome do pet deve ter entre 1 e 50 caracteres.', nameInput);
    return;
  }
  if (!ESPECIES_VALIDAS.has(especie)) {
    mostrarErro(petError, 'Selecione a espécie do pet.', speciesSelect);
    return;
  }
  if (raca.length > 50) {
    mostrarErro(petError, 'Raça deve ter no máximo 50 caracteres.', breedInput);
    return;
  }
  if (!isDataRealISO(dataNascimento)) {
    mostrarErro(petError, 'Informe uma data de nascimento válida.', birthInput);
    return;
  }
  if (dataNascimento > getHojeISO()) {
    mostrarErro(petError, 'A data de nascimento não pode estar no futuro.', birthInput);
    return;
  }

  const peso = Number(pesoStr);
  if (!pesoStr || !Number.isFinite(peso) || peso <= 0 || peso > 200) {
    mostrarErro(petError, 'Peso deve ser maior que 0 e até 200 kg.', weightInput);
    return;
  }

  if (sexo && !SEXOS_VALIDOS.has(sexo)) {
    mostrarErro(petError, 'Selecione um sexo válido.', sexSelect);
    return;
  }

  let comprimentoCm = null;
  if (comprimentoStr !== '') {
    comprimentoCm = Number(comprimentoStr);
    if (!Number.isFinite(comprimentoCm) || comprimentoCm <= 0 || comprimentoCm > 300) {
      mostrarErro(petError, 'Comprimento deve ser maior que 0 e até 300 cm.', lengthInput);
      return;
    }
  }

  let alturaCm = null;
  if (alturaStr !== '') {
    alturaCm = Number(alturaStr);
    if (!Number.isFinite(alturaCm) || alturaCm <= 0 || alturaCm > 300) {
      mostrarErro(petError, 'Altura deve ser maior que 0 e até 300 cm.', heightInput);
      return;
    }
  }

  const payload = {
    nome,
    especie,
    raca,
    dataNascimento,
    peso,
    sexo,
    comprimentoCm: comprimentoCm ?? '',
    alturaCm: alturaCm ?? '',
  };

  petSaveBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${encodeURIComponent(petId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(petError, data.message || 'Erro ao atualizar dados do pet.');
      return;
    }

    renderizarPet(data);
    mostrarSucesso(petSuccess, data.message || 'Dados do pet atualizados com sucesso.');
  } catch {
    mostrarErro(petError, 'Erro de comunicação com o servidor.');
  } finally {
    petSaveBtn.disabled = false;
  }
});

// Foto do pet
photoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparMensagens(photoError, photoSuccess, photoForm);

  const file = photoInput.files[0];
  if (!file) {
    mostrarErro(photoError, 'Escolha uma imagem JPEG, PNG ou WebP.', photoInput);
    return;
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    mostrarErro(photoError, 'Formato inválido. Envie uma imagem JPEG, PNG ou WebP.', photoInput);
    return;
  }
  if (file.size > MAX_PHOTO_SIZE) {
    mostrarErro(photoError, 'A foto pode ter no máximo 2 MB.', photoInput);
    return;
  }

  const body = new FormData();
  body.append('foto', file);

  photoSaveBtn.disabled = true;
  photoRemoveBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${encodeURIComponent(petId)}/foto`, {
      method: 'PUT',
      credentials: 'same-origin',
      body,
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(photoError, data.message || 'Erro ao enviar foto do pet.');
      return;
    }

    photoForm.reset();
    atualizarAvatar(true);
    mostrarSucesso(photoSuccess, data.message || 'Foto do pet atualizada com sucesso.');
  } catch {
    mostrarErro(photoError, 'Erro de comunicação com o servidor.');
  } finally {
    photoSaveBtn.disabled = false;
    photoRemoveBtn.disabled = false;
  }
});

photoRemoveBtn.addEventListener('click', async () => {
  if (!window.confirm('Deseja remover a foto deste pet?')) return;
  limparMensagens(photoError, photoSuccess, photoForm);

  photoSaveBtn.disabled = true;
  photoRemoveBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${encodeURIComponent(petId)}/foto`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(photoError, data.message || 'Erro ao remover foto do pet.');
      return;
    }

    photoForm.reset();
    atualizarAvatar(false);
    mostrarSucesso(photoSuccess, data.message || 'Foto do pet removida com sucesso.');
  } catch {
    mostrarErro(photoError, 'Erro de comunicação com o servidor.');
  } finally {
    photoSaveBtn.disabled = false;
    photoRemoveBtn.disabled = false;
  }
});

// Excluir pet
function atualizarBotaoExclusao() {
  const esperado = currentPet ? currentPet.nome.trim() : '';
  deleteSubmitBtn.disabled = !esperado || deleteConfirmInput.value.trim() !== esperado;
}

deletePetBtn.addEventListener('click', () => {
  if (!currentPet) return;
  limparMensagens(deleteError, null, deleteForm);
  deleteForm.reset();
  deleteConfirmLabel.innerHTML = `Digite <strong>${esc(currentPet.nome)}</strong> para confirmar a exclusão`;
  deleteConfirmInput.placeholder = currentPet.nome;
  atualizarBotaoExclusao();
  deleteDialog.showModal();
  deleteConfirmInput.focus();
});

deleteConfirmInput.addEventListener('input', atualizarBotaoExclusao);
deleteCloseBtn.addEventListener('click', () => deleteDialog.close());
deleteCancelBtn.addEventListener('click', () => deleteDialog.close());

deleteDialog.addEventListener('click', (event) => {
  if (event.target === deleteDialog) deleteDialog.close();
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentPet) return;
  limparMensagens(deleteError, null, deleteForm);

  if (deleteConfirmInput.value.trim() !== currentPet.nome.trim()) {
    mostrarErro(deleteError, 'O nome digitado não corresponde ao nome do pet.', deleteConfirmInput);
    return;
  }

  deleteSubmitBtn.disabled = true;
  try {
    const response = await fetch(`/api/pets/${encodeURIComponent(petId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(deleteError, data.message || 'Erro ao excluir pet.');
      atualizarBotaoExclusao();
      return;
    }

    if (sessionStorage.getItem('activePetId') === petId) {
      sessionStorage.removeItem('activePetId');
    }
    window.location.href = 'perfil.html';
  } catch {
    mostrarErro(deleteError, 'Erro de comunicação com o servidor.');
    atualizarBotaoExclusao();
  }
});

// Carregamento
async function inicializarEdicaoPet() {
  if (!petId) {
    mostrarEstadoErro('Nenhum pet selecionado para edição.', false);
    return;
  }

  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  try {
    const pet = await fetchAPI(`/api/pets/${encodeURIComponent(petId)}`);
    renderizarPet(pet);

    loadingState.hidden = true;
    content.hidden = false;
  } catch (error) {
    if (error.message === 'Não autorizado') return;
    if (error.status === 404) {
      mostrarEstadoErro('Pet não encontrado ou você não tem permissão para editá-lo.', false);
    } else {
      mostrarEstadoErro('Ocorreu um erro ao carregar os dados do pet.', true);
    }
  }
}

retryBtn.addEventListener('click', () => location.reload());
inicializarEdicaoPet();
