/*
* Autoria: Mateus de Souza Campos
* RA: 25009935
*/

// Data de hoje no formato "04 de novembro de 2026"
const dateEl = document.getElementById('today-date');
dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

// Troca de pet: atualiza a saudação e o botão ativo
const petName = document.getElementById('pet-name');
const avatars = document.querySelectorAll('.pet-avatar');

avatars.forEach((button) => {
  button.addEventListener('click', () => {
    avatars.forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('is-active');
    button.setAttribute('aria-pressed', 'true');
    petName.textContent = button.dataset.pet;
    // TODO: carregar os dados do pet selecionado
  });
});

// Registrar medicamento como tomado
document.querySelectorAll('[data-action="mark-taken"]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('.card').classList.add('is-done');
    button.textContent = 'Tomado';
    button.disabled = true;
    // TODO: salvar o registro
  });
});