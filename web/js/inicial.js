/*
* Autoria: Mateus de Souza Campos | RA: 25009935
* Integração e Lógica: Felipe Nasser Coelho Moussa | RA: 25004922
*/

const pawSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2" ry="2.8" /><ellipse cx="10" cy="5.8" rx="2" ry="2.8" /><ellipse cx="14" cy="5.8" rx="2" ry="2.8" /><ellipse cx="18" cy="10" rx="2" ry="2.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.4 0 1.6 1.3 2.6 2.9 2.6 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.6 0 2.9-1 2.9-2.6C17.5 14 15 11 12 11z" /></svg>`;

// Elementos
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const painelContent = document.getElementById('painel-content');

const dateEl = document.getElementById('today-date');
const petNameEl = document.getElementById('pet-name');
const petListEl = document.getElementById('pet-list');
const petSwitcherContainer = document.getElementById('pet-switcher-container');

// Listas e Empty States
const sections = {
  meds: { list: document.getElementById('med-list'), empty: document.getElementById('meds-empty') },
  today: { list: document.getElementById('today-list'), empty: document.getElementById('today-empty') },
  next: { list: document.getElementById('next-list'), empty: document.getElementById('next-empty') },
  late: { list: document.getElementById('late-list'), empty: document.getElementById('late-empty') }
};

// Data
dateEl.textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const formatData = (dataISO) => {
  const [y, m, d] = dataISO.split('-');
  return `${d}/${m}/${y}`;
};

// Wrapper API
async function fetchAPI(endpoint) {
  const response = await fetch(endpoint);
  if (response.status === 401) {
    window.location.href = "login.html";
    throw new Error("Não autorizado");
  }
  if (!response.ok) {
    throw new Error("Erro na requisição");
  }
  return response.json();
}

async function carregarPainelDoPet(petId) {
  loadingState.hidden = false;
  errorState.hidden = true;
  painelContent.hidden = true;

  try {
    const data = await fetchAPI(`/api/pets/${petId}/dashboard`);
    renderizarDashboard(data);

    loadingState.hidden = true;
    painelContent.hidden = false;
  } catch (error) {
    if (error.message !== "Não autorizado") {
      loadingState.hidden = true;
      errorState.hidden = false;
    }
  }
}

function renderizarDashboard(data) {
  petNameEl.textContent = data.pet.nome;

  // Renderiza Medicamentos
  sections.meds.list.innerHTML = '';
  if (data.medicamentosHoje.length === 0) {
    sections.meds.empty.hidden = false;
  } else {
    sections.meds.empty.hidden = true;
    data.medicamentosHoje.forEach(med => {
      const isDoneClass = med.tomado ? 'is-done' : 'card--brand';
      const btnText = med.tomado ? 'Tomado' : 'Registrar como tomado';

      sections.meds.list.innerHTML += `
        <article class="card ${isDoneClass}">
          <div class="card__row">
            <h3 class="card__title">${med.nome}</h3>
            <span class="card__time">${med.horario}</span>
          </div>
          <p class="card__meta">${med.dose}</p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
            <button type="button" class="btn btn--sm" disabled>${btnText}</button>
          </div>
        </article>`;
    });
  }

  // Renderiza Hoje (Consultas)
  sections.today.list.innerHTML = '';
  if (data.hoje.length === 0) {
    sections.today.empty.hidden = false;
  } else {
    sections.today.empty.hidden = true;
    data.hoje.forEach(item => {
      sections.today.list.innerHTML += `
        <article class="card card--warning">
          <div class="card__row">
            <h3 class="card__title">${item.titulo}</h3>
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
          </div>
          <p class="card__meta">${item.registro}</p>
        </article>`;
    });
  }

  // Renderiza Próximos 7 Dias
  sections.next.list.innerHTML = '';
  if (data.proximos7Dias.length === 0) {
    sections.next.empty.hidden = false;
  } else {
    sections.next.empty.hidden = true;
    data.proximos7Dias.forEach(item => {
      sections.next.list.innerHTML += `
        <article class="card card--neutral">
          <div class="card__row">
            <h3 class="card__title">${item.titulo}</h3>
            <span class="card__meta">${formatData(item.data)}</span>
          </div>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
          </div>
        </article>`;
    });
  }

  // Renderiza Atrasados
  sections.late.list.innerHTML = '';
  if (data.atrasados.length === 0) {
    sections.late.empty.hidden = false;
  } else {
    sections.late.empty.hidden = true;
    data.atrasados.forEach(item => {
      sections.late.list.innerHTML += `
        <article class="card card--danger">
          <div class="card__row">
            <svg class="card__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3 1.5 21h21L12 3zm0 6 6.9 12H5.1L12 9zm-1 3v4h2v-4h-2zm0 5v2h2v-2h-2z" />
            </svg>
            <h3 class="card__title">${item.titulo}</h3>
          </div>
          <p class="card__meta">${formatData(item.data)}</p>
          <div class="card__actions">
            <button type="button" class="btn btn--sm btn--outline" disabled>Ver detalhes</button>
          </div>
        </article>`;
    });
  }
}

async function inicializarAplicacao() {
  try {
    // Busca os pets
    const pets = await fetchAPI('/api/pets');

    // Sem pets
    if (pets.length === 0) {
      window.location.href = "cadastro-pet.html";
      return;
    }

    // Verifica 1 pet
    if (pets.length === 1) {
      petSwitcherContainer.style.display = 'none';
    } else {
      petSwitcherContainer.style.display = 'flex';
      petListEl.innerHTML = '';
    }

    // Escolher pet
    let activePetId = sessionStorage.getItem('activePetId');
    if (!activePetId || !pets.some(p => p._id === activePetId)) {
      activePetId = pets[0]._id;
      sessionStorage.setItem('activePetId', activePetId);
    }

    // Seletor
    pets.forEach(pet => {
      const isActive = pet._id === activePetId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pet-avatar ${isActive ? 'is-active' : ''}`;
      btn.title = pet.nome;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.innerHTML = pawSvg;

      btn.addEventListener('click', () => {
        if (pet._id !== sessionStorage.getItem('activePetId')) {
          sessionStorage.setItem('activePetId', pet._id);

          document.querySelectorAll('.pet-avatar').forEach(b => {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');

          carregarPainelDoPet(pet._id);
        }
      });

      petListEl.appendChild(btn);
    });

    // Carrega painel do pet
    await carregarPainelDoPet(activePetId);

  } catch (error) {
    if (error.message !== "Não autorizado") {
      loadingState.hidden = true;
      errorState.hidden = false;
    }
  }
}

inicializarAplicacao();