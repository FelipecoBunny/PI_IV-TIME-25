/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const form = document.getElementById("login-form");
const errorBox = document.getElementById("form-error");
const successBox = document.getElementById("form-success");

// Exibe confirmação ao voltar da redefinição de senha
if (new URLSearchParams(window.location.search).get("reset") === "1" && successBox) {
  successBox.textContent = "Senha redefinida com sucesso. Entre com sua nova senha.";
  successBox.hidden = false;
  window.history.replaceState({}, "", "login.html");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  errorBox.hidden = true;
  if (successBox) successBox.hidden = true;

  const email = form.email.value.trim();
  const password = form.password.value;

  if (email === "" || password === "") {
    showError("Preencha o e-mail e a senha.");
    return;
  }

  if (!form.email.checkValidity()) {
    showError("Digite um e-mail válido.");
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      showError(data.message || "Erro ao realizar login.");
      return;
    }

    // Quantos pets
    const petsResponse = await fetch("/api/pets");

    if (petsResponse.ok) {
      const pets = await petsResponse.json();

      if (pets.length > 0) {
        window.location.href = "inicial.html";
      } else {
        window.location.href = "cadastro-pet.html";
      }
    } else {
      window.location.href = "cadastro-pet.html";
    }

  } catch (error) {
    showError("Erro de comunicação com o servidor.");
  }

  console.log("Formulário válido. Pronto para enviar ao backend:", { email });
});
