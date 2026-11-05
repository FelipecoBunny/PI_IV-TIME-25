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

// Data de hoje
const now = new Date();
const today =
  now.getFullYear() + "-" +
  String(now.getMonth() + 1).padStart(2, "0") + "-" +
  String(now.getDate()).padStart(2, "0");

birthInput.max = today;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", async function (event) {
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

  try {
    const breed = document.getElementById("breed").value.trim();

    const response = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: petName,
        especie: species,
        raca: breed,
        dataNascimento: birthDate,
        peso: Number(weight)
      })
    });

    if (!response.ok) {
      const data = await response.json();
      showError(data.erro || "Erro ao cadastrar o pet.");
      return;
    }

    // Redireciona para o painel após o cadastro
    window.location.href = "inicial.html";

  } catch (error) {
    showError("Erro de comunicação com o servidor.");
  }
});