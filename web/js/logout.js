/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

document.addEventListener("click", async (event) => {
  const link = event.target.closest("[data-logout]");
  if (!link) return;

  event.preventDefault();
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } catch {
    // Em falha redireciona para login
  } finally {
    sessionStorage.removeItem("activePetId");
    window.location.href = "login.html";
  }
});
