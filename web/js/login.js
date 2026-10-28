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

form.addEventListener("submit", function (event) {
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

  // TODO (quando o backend existir): enviar { email, password } para a rota de login
  // e, se der certo, redirecionar para o Painel de Status.
  console.log("Formulário válido. Pronto para enviar ao backend:", { email });
});
