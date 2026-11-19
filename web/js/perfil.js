/*
* Autoria: Maria Júlia Souza de Oliveira
* RA: 25007909
*/

// Elementos de estado
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const content = document.getElementById('perfil-content');
const retryBtn = document.getElementById('retry-btn');

// Topo do perfil
const avatarImg = document.getElementById('profile-avatar-img');
const avatarInitials = document.getElementById('profile-avatar-initials');
const profileNameEl = document.getElementById('profile-name');
const profileEmailEl = document.getElementById('profile-email');
const profileSinceEl = document.getElementById('profile-since');

// Formulário de dados pessoais
const profileForm = document.getElementById('profile-form');
const profileError = document.getElementById('profile-error');
const profileSuccess = document.getElementById('profile-success');
const nameInput = document.getElementById('tutor-name');
const emailInput = document.getElementById('tutor-email');
const phoneInput = document.getElementById('tutor-phone');
const cityInput = document.getElementById('tutor-city');
const profileSaveBtn = document.getElementById('profile-save');

// Formulário de foto
const photoForm = document.getElementById('photo-form');
const photoError = document.getElementById('photo-error');
const photoSuccess = document.getElementById('photo-success');
const photoInput = document.getElementById('photo-input');
const photoSaveBtn = document.getElementById('photo-save');
const photoRemoveBtn = document.getElementById('photo-remove');

// Formulário de senha
const passwordForm = document.getElementById('password-form');
const passwordError = document.getElementById('password-error');
const passwordSuccess = document.getElementById('password-success');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordSaveBtn = document.getElementById('password-save');

// Pets
const petsListEl = document.getElementById('pets-list');
const petsEmptyEl = document.getElementById('pets-empty');

// Exclusão de conta
const deleteAccountBtn = document.getElementById('delete-account-btn');
const deleteDialog = document.getElementById('delete-dialog');
const deleteCloseBtn = document.getElementById('delete-close');
const deleteCancelBtn = document.getElementById('delete-cancel');
const deleteForm = document.getElementById('delete-form');
const deleteError = document.getElementById('delete-error');
const deletePasswordInput = document.getElementById('delete-password');
const deleteConfirmCheckbox = document.getElementById('delete-confirm');
const deleteSubmitBtn = document.getElementById('delete-submit');

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Utilidades
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getInitials(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarTelefone(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor || '';
}

function formatarMesAno(dataISO) {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

// Avatar
function atualizarAvatar(nome, temFoto) {
  avatarInitials.textContent = getInitials(nome);

  if (temFoto) {
    avatarImg.src = `/api/auth/me/foto?v=${Date.now()}`;
    avatarImg.hidden = false;
    avatarInitials.hidden = true;
    photoRemoveBtn.hidden = false;
  } else {
    avatarImg.hidden = true;
    avatarImg.removeAttribute('src');
    avatarInitials.hidden = false;
    photoRemoveBtn.hidden = true;
  }
}

avatarImg.addEventListener('error', () => {
  avatarImg.hidden = true;
  avatarInitials.hidden = false;
});

// Renderização
function renderizarPerfil(user) {
  profileNameEl.textContent = user.name || '';
  profileEmailEl.textContent = user.email || '';

  const desde = formatarMesAno(user.criadoEm);
  if (desde) {
    profileSinceEl.textContent = `Membro desde ${desde}`;
    profileSinceEl.hidden = false;
  } else {
    profileSinceEl.hidden = true;
  }

  nameInput.value = user.name || '';
  emailInput.value = user.email || '';
  phoneInput.value = formatarTelefone(user.telefone || '');
  cityInput.value = user.cidade || '';

  atualizarAvatar(user.name, Boolean(user.temFoto));
}

function renderizarPets(pets) {
  if (!Array.isArray(pets) || pets.length === 0) {
    petsListEl.innerHTML = '';
    petsEmptyEl.hidden = false;
    return;
  }

  petsEmptyEl.hidden = true;
  petsListEl.innerHTML = pets.map((pet) => {
    const detalhes = pet.raca
      ? `${pet.especie || 'Pet'} · ${pet.raca}`
      : (pet.especie || 'Pet');

    return `
      <li class="pet-profile-item">
        <div class="pet-profile-item__info">
          <p class="pet-profile-item__name">${esc(pet.nome)}</p>
          <p class="pet-profile-item__meta">${esc(detalhes)}</p>
        </div>
        <a href="pet-editar.html?petId=${encodeURIComponent(pet._id)}" class="btn btn--sm btn--outline">Editar</a>
      </li>`;
  }).join('');
}

// Botões de mostrar/ocultar senha
document.addEventListener('click', (event) => {
  const toggleBtn = event.target.closest('.toggle-password');
  if (!toggleBtn) return;

  const wrapper = toggleBtn.closest('.password-field');
  const input = wrapper && wrapper.querySelector('input');
  if (!input) return;

  const mostrando = input.type === 'text';
  input.type = mostrando ? 'password' : 'text';
  toggleBtn.classList.toggle('is-visible', !mostrando);
  toggleBtn.setAttribute('aria-pressed', String(!mostrando));
  toggleBtn.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
});

document.addEventListener('input', (event) => {
  if (event.target.getAttribute && event.target.getAttribute('aria-invalid') === 'true') {
    event.target.removeAttribute('aria-invalid');
  }
});

// Salvar dados pessoais
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparMensagens(profileError, profileSuccess, profileForm);

  const name = nameInput.value.trim();
  const telefoneBruto = phoneInput.value.trim();
  const cidade = cityInput.value.trim();

  if (name.length < 1 || name.length > 80) {
    mostrarErro(profileError, 'Nome deve ter entre 1 e 80 caracteres.', nameInput);
    return;
  }

  let telefone = '';
  if (telefoneBruto) {
    if (!/^[\d\s()+-]+$/.test(telefoneBruto)) {
      mostrarErro(profileError, 'Telefone inválido. Informe 10 ou 11 dígitos.', phoneInput);
      return;
    }
    const digitos = telefoneBruto.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11) {
      mostrarErro(profileError, 'Telefone deve ter 10 ou 11 dígitos.', phoneInput);
      return;
    }
    telefone = digitos;
  }

  if (cidade.length > 80) {
    mostrarErro(profileError, 'Cidade deve ter no máximo 80 caracteres.', cityInput);
    return;
  }

  profileSaveBtn.disabled = true;
  try {
    const response = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name, telefone, cidade }),
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(profileError, data.message || 'Erro ao atualizar seus dados.');
      return;
    }

    renderizarPerfil(data);
    mostrarSucesso(profileSuccess, data.message || 'Dados atualizados com sucesso.');
  } catch {
    mostrarErro(profileError, 'Erro de comunicação com o servidor.');
  } finally {
    profileSaveBtn.disabled = false;
  }
});

// Foto de perfil
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
    const response = await fetch('/api/auth/me/foto', {
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
      mostrarErro(photoError, data.message || 'Erro ao enviar foto de perfil.');
      return;
    }

    photoForm.reset();
    atualizarAvatar(profileNameEl.textContent, true);
    mostrarSucesso(photoSuccess, data.message || 'Foto de perfil atualizada com sucesso.');
  } catch {
    mostrarErro(photoError, 'Erro de comunicação com o servidor.');
  } finally {
    photoSaveBtn.disabled = false;
    photoRemoveBtn.disabled = false;
  }
});

photoRemoveBtn.addEventListener('click', async () => {
  if (!window.confirm('Deseja remover sua foto de perfil?')) return;
  limparMensagens(photoError, photoSuccess, photoForm);

  photoSaveBtn.disabled = true;
  photoRemoveBtn.disabled = true;
  try {
    const response = await fetch('/api/auth/me/foto', {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(photoError, data.message || 'Erro ao remover foto de perfil.');
      return;
    }

    photoForm.reset();
    atualizarAvatar(profileNameEl.textContent, false);
    mostrarSucesso(photoSuccess, data.message || 'Foto de perfil removida com sucesso.');
  } catch {
    mostrarErro(photoError, 'Erro de comunicação com o servidor.');
  } finally {
    photoSaveBtn.disabled = false;
    photoRemoveBtn.disabled = false;
  }
});

// Alterar senha
passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparMensagens(passwordError, passwordSuccess, passwordForm);

  const senhaAtual = currentPasswordInput.value;
  const novaSenha = newPasswordInput.value;
  const confirmarSenha = confirmPasswordInput.value;

  if (!senhaAtual) {
    mostrarErro(passwordError, 'Informe sua senha atual.', currentPasswordInput);
    return;
  }
  if (novaSenha.length < 8 || novaSenha.length > 72) {
    mostrarErro(passwordError, 'A nova senha deve ter entre 8 e 72 caracteres.', newPasswordInput);
    return;
  }
  if (novaSenha === senhaAtual) {
    mostrarErro(passwordError, 'A nova senha deve ser diferente da senha atual.', newPasswordInput);
    return;
  }
  if (novaSenha !== confirmarSenha) {
    mostrarErro(passwordError, 'A confirmação não coincide com a nova senha.', confirmPasswordInput);
    return;
  }

  passwordSaveBtn.disabled = true;
  try {
    const response = await fetch('/api/auth/me/senha', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(passwordError, data.message || 'Erro ao alterar senha.');
      return;
    }

    passwordForm.reset();
    mostrarSucesso(passwordSuccess, data.message || 'Senha alterada com sucesso.');
  } catch {
    mostrarErro(passwordError, 'Erro de comunicação com o servidor.');
  } finally {
    passwordSaveBtn.disabled = false;
  }
});

// Excluir conta
deleteAccountBtn.addEventListener('click', () => {
  limparMensagens(deleteError, null, deleteForm);
  deleteForm.reset();
  deleteDialog.showModal();
  deletePasswordInput.focus();
});

deleteCloseBtn.addEventListener('click', () => deleteDialog.close());
deleteCancelBtn.addEventListener('click', () => deleteDialog.close());

deleteDialog.addEventListener('click', (event) => {
  if (event.target === deleteDialog) deleteDialog.close();
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparMensagens(deleteError, null, deleteForm);

  const senha = deletePasswordInput.value;
  if (!senha) {
    mostrarErro(deleteError, 'Informe sua senha para confirmar a exclusão.', deletePasswordInput);
    return;
  }
  if (!deleteConfirmCheckbox.checked) {
    mostrarErro(deleteError, 'Marque a caixa de confirmação para continuar.', deleteConfirmCheckbox);
    return;
  }

  deleteSubmitBtn.disabled = true;
  try {
    const response = await fetch('/api/auth/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ senha }),
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(deleteError, data.message || 'Erro ao excluir conta.');
      return;
    }

    sessionStorage.clear();
    window.location.href = 'login.html';
  } catch {
    mostrarErro(deleteError, 'Erro de comunicação com o servidor.');
  } finally {
    deleteSubmitBtn.disabled = false;
  }
});

// Carregamento
async function inicializarPerfil() {
  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  try {
    const [user, pets] = await Promise.all([
      fetchAPI('/api/auth/me'),
      fetchAPI('/api/pets'),
    ]);

    renderizarPerfil(user);
    renderizarPets(pets);

    loadingState.hidden = true;
    content.hidden = false;
  } catch (error) {
    if (error.message !== 'Não autorizado') falhaAoCarregar();
  }
}

retryBtn.addEventListener('click', () => location.reload());
inicializarPerfil();