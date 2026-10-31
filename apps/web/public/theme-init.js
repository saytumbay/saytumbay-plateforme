// Thème appliqué avant le premier rendu (évite le flash). Fichier externe pour respecter la CSP.
try {
  var t = localStorage.getItem("saytumbay:theme");
  var dark = t === "sombre" || (t !== "clair" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
