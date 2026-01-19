const form = document.querySelector(".cta-form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.querySelector("input").value;
    if (email.trim().length === 0) {
      return;
    }
    form.reset();
    form.querySelector("button").textContent = "Заявка отправлена";
  });
}
