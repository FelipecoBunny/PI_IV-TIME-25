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

form.addEventListener("submit", async function (event) {
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

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: tutorName, email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      showError(data.message || "Erro ao realizar o cadastro.");
      return;
    }

    window.location.href = "cadastro-pet.html";
  } catch (error) {
    showError("Erro de comunicação com o servidor.");
  }

  window.location.href = "cadastro-pet.html";
});
