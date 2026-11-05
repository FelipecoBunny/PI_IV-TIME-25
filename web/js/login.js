/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const form = document.getElementById("login-form");
const errorBox = document.getElementById("form-error");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", async function (event) {
  event.preventDefault(); // impede a página de recarregar
  errorBox.hidden = true;

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

    window.location.href = "cadastro-pet.html";
  } catch (error) {
    showError("Erro de comunicação com o servidor.");
  }

  console.log("Formulário válido. Pronto para enviar ao backend:", { email });
});
