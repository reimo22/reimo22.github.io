// Theme toggle. The *applying* of the stored theme happens in the inline
// blocking script in <head> — this file only handles interaction, so it is
// safe to defer. Icon glyphs come from CSS (::before on .theme-toggle-icon),
// which keeps them correct before this script runs.
(function () {
  "use strict";

  var STORAGE_KEY = "theme";
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  if (!button) return;

  function currentTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") return explicit;
    return "dark";
  }

  function syncLabel() {
    button.setAttribute(
      "aria-label",
      currentTheme() === "dark"
        ? "Switch to light theme"
        : "Switch to dark theme",
    );
  }

  button.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage disabled: the choice just doesn't survive navigation */
    }
    syncLabel();
  });

  syncLabel();
})();
