/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

const form = document.getElementById("pet-form");
const errorBox = document.getElementById("form-error");

const petNameInput = document.getElementById("pet-name");
const speciesSelect = document.getElementById("species");
const birthInput = document.getElementById("birth-date");
const weightInput = document.getElementById("weight");
const photoInput = document.getElementById("photo");

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

// Data de hoje no formato AAAA-MM-DD (hora local, não UTC)
const now = new Date();
const today =
  now.getFullYear() + "-" +
  String(now.getMonth() + 1).padStart(2, "0") + "-" +
  String(now.getDate()).padStart(2, "0");

// O calendário já não deixa escolher uma data futura
birthInput.max = today;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  errorBox.hidden = true;

  const petName = petNameInput.value.trim();
  const species = speciesSelect.value;
  const birthDate = birthInput.value;
  const weight = weightInput.value;

  if (petName === "" || species === "" || birthDate === "" || weight === "") {
    showError("Preencha nome, espécie, data de nascimento e peso.");
    return;
  }

  // Datas no formato AAAA-MM-DD podem ser comparadas como texto
  if (birthDate > today) {
    showError("A data de nascimento não pode estar no futuro.");
    return;
  }

  if (Number(weight) <= 0) {
    showError("O peso precisa ser maior que zero.");
    return;
  }

  if (photoInput.files.length > 0) {
    const photo = photoInput.files[0];

    if (!photo.type.startsWith("image/")) {
      showError("A foto precisa ser uma imagem.");
      return;
    }

    if (photo.size > MAX_PHOTO_BYTES) {
      showError("A foto pode ter no máximo 2 MB.");
      return;
    }
  }

  // TODO (quando o backend existir): enviar os dados do pet (e a foto, se houver)
  // e, se der certo, redirecionar para o Painel de Status.
  console.log("Pet válido. Pronto para enviar ao backend:", { petName, species, birthDate, weight });
});
