/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const form = document.getElementById("signup-form");
const errorBox = document.getElementById("form-error");

const nameInput = document.getElementById("tutor-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("password-confirm");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  errorBox.hidden = true;

  const tutorName = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (tutorName === "" || email === "" || password === "" || confirm === "") {
    showError("Preencha todos os campos.");
    return;
  }

  if (!emailInput.checkValidity()) {
    showError("Digite um e-mail válido.");
    return;
  }

  if (password.length < 8) {
    showError("A senha precisa ter pelo menos 8 caracteres.");
    return;
  }

  if (password !== confirm) {
    showError("As senhas não coincidem.");
    return;
  }

  // TODO (quando o backend existir): enviar { name, email, password } e só
  // seguir para a etapa 2 se a conta for criada (ex.: e-mail ainda não usado).
  window.location.href = "cadastro-pet.html";
});
