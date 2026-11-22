/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const errorBox = document.getElementById("recovery-error");
const successBox = document.getElementById("recovery-success");

const requestForm = document.getElementById("request-form");
const emailInput = document.getElementById("recovery-email");
const requestSubmitBtn = document.getElementById("request-submit");

const resetForm = document.getElementById("reset-form");
const codeInput = document.getElementById("reset-code");
const codeHint = document.getElementById("code-hint");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const resetSubmitBtn = document.getElementById("reset-submit");
const resendBtn = document.getElementById("resend-btn");
const changeEmailBtn = document.getElementById("change-email-btn");

let emailAtual = "";
let cooldownTimer = null;

function limparMensagens() {
  errorBox.hidden = true;
  successBox.hidden = true;
}

function mostrarErro(mensagem, campo) {
  successBox.hidden = true;
  errorBox.textContent = mensagem;
  errorBox.hidden = false;
  if (campo) campo.focus();
}

function mostrarSucesso(mensagem) {
  errorBox.hidden = true;
  successBox.textContent = mensagem;
  successBox.hidden = false;
}

function iniciarCooldownReenvio(segundos = 60) {
  if (cooldownTimer) clearInterval(cooldownTimer);
  let restante = segundos;
  resendBtn.disabled = true;
  resendBtn.textContent = `Reenviar código (${restante}s)`;

  cooldownTimer = setInterval(() => {
    restante -= 1;
    if (restante <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      resendBtn.disabled = false;
      resendBtn.textContent = "Reenviar código";
      return;
    }
    resendBtn.textContent = `Reenviar código (${restante}s)`;
  }, 1000);
}

// Mantém apenas números no campo do código
codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
});

// Botões de mostrar/ocultar senha
document.addEventListener("click", (event) => {
  const toggleBtn = event.target.closest(".toggle-password");
  if (!toggleBtn) return;

  const wrapper = toggleBtn.closest(".password-field");
  const input = wrapper && wrapper.querySelector("input");
  if (!input) return;

  const mostrando = input.type === "text";
  input.type = mostrando ? "password" : "text";
  toggleBtn.classList.toggle("is-visible", !mostrando);
  toggleBtn.setAttribute("aria-pressed", String(!mostrando));
  toggleBtn.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
});

async function solicitarCodigo(email) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Erro ao solicitar código de recuperação.");
  }
  return data;
}

// Passo 1: enviar código para o e-mail
requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagens();

  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    mostrarErro("Digite um e-mail válido.", emailInput);
    return;
  }

  requestSubmitBtn.disabled = true;
  requestSubmitBtn.textContent = "Enviando...";
  try {
    const data = await solicitarCodigo(email);
    emailAtual = email;
    codeHint.textContent = `Digite os 6 dígitos enviados para ${emailAtual}.`;

    requestForm.hidden = true;
    resetForm.hidden = false;
    resetForm.reset();

    mostrarSucesso(data.message || "Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos.");
    iniciarCooldownReenvio(60);
    codeInput.focus();
  } catch (error) {
    mostrarErro(error.message || "Erro de comunicação com o servidor.");
  } finally {
    requestSubmitBtn.disabled = false;
    requestSubmitBtn.textContent = "Enviar código";
  }
});

// Reenviar código
resendBtn.addEventListener("click", async () => {
  if (!emailAtual || resendBtn.disabled) return;
  limparMensagens();
  resendBtn.disabled = true;
  resendBtn.textContent = "Enviando...";

  try {
    const data = await solicitarCodigo(emailAtual);
    mostrarSucesso(data.message || "Novo código enviado. Verifique sua caixa de entrada e o spam.");
    iniciarCooldownReenvio(60);
    codeInput.focus();
  } catch (error) {
    resendBtn.disabled = false;
    resendBtn.textContent = "Reenviar código";
    mostrarErro(error.message || "Erro de comunicação com o servidor.");
  }
});

// Voltar para trocar o e-mail
changeEmailBtn.addEventListener("click", () => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
  limparMensagens();
  resetForm.hidden = true;
  requestForm.hidden = false;
  resendBtn.disabled = false;
  resendBtn.textContent = "Reenviar código";
  emailInput.focus();
});

// Passo 2: validar código e definir nova senha
resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagens();

  const codigo = codeInput.value.trim();
  const novaSenha = newPasswordInput.value;
  const confirmarSenha = confirmPasswordInput.value;

  if (!/^\d{6}$/.test(codigo)) {
    mostrarErro("Digite os 6 dígitos do código recebido por e-mail.", codeInput);
    return;
  }
  if (novaSenha.length < 8 || novaSenha.length > 72) {
    mostrarErro("A nova senha deve ter entre 8 e 72 caracteres.", newPasswordInput);
    return;
  }
  if (novaSenha !== confirmarSenha) {
    mostrarErro("A confirmação não coincide com a nova senha.", confirmPasswordInput);
    return;
  }

  resetSubmitBtn.disabled = true;
  resetSubmitBtn.textContent = "Salvando...";
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: emailAtual, codigo, novaSenha }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mostrarErro(data.message || "Não foi possível redefinir a senha.");
      return;
    }

    window.location.href = "login.html?reset=1";
  } catch {
    mostrarErro("Erro de comunicação com o servidor.");
  } finally {
    resetSubmitBtn.disabled = false;
    resetSubmitBtn.textContent = "Redefinir senha";
  }
});