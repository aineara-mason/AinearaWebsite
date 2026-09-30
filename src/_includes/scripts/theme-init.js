/* Runs inline in <head> before first paint (spec §6.1). A classic script
   with no module syntax. base.njk includes it through Nunjucks, so it must
   never contain template delimiters. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var saved = null;
  try {
    saved = window.localStorage.getItem("aineara-theme");
  } catch (error) {
    saved = null;
  }
  var theme;
  if (saved === "light" || saved === "dark") {
    theme = saved;
  } else {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  root.setAttribute("data-theme", theme);
})();
