// Home theme only (game logic lives in game.js)
const root = document.documentElement, b = document.getElementById("themeBtn");
if (b) {
  if (localStorage.getItem("ucw-theme")) root.setAttribute("data-theme", localStorage.getItem("ucw-theme"));
  const p = () => b.textContent = root.getAttribute("data-theme") === "light" ? "Dark" : "Light";
  p();
  b.onclick = () => { const n = root.getAttribute("data-theme") === "light" ? "dark" : "light"; root.setAttribute("data-theme", n); localStorage.setItem("ucw-theme", n); p(); };
}
