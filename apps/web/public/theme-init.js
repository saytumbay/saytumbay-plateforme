// Thème appliqué avant le premier rendu (évite le flash). Fichier externe pour respecter la CSP.
// Le site public reste toujours clair (couleurs de la marque) ; seuls l'espace client (/app) et la console (/admin)
// suivent le choix de l'utilisateur ou le réglage de l'ordinateur. Même règle que src/lib/theme.tsx.
try {
  var app = /^\/(app|admin)(\/|$)/.test(location.pathname);
  var t = localStorage.getItem("saytumbay:theme");
  var dark = app && (t === "sombre" || (t !== "clair" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
