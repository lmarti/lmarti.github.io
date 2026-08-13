// Reader tools in the nav: text size (magnifier ±) and forced light/dark
// theme (sun/moon). Preferences persist in localStorage and are re-applied
// before first paint by the inline script in _includes/head.html; this file
// only wires the buttons. Without JS the .nav-tools group stays hidden.
(function () {
  "use strict";

  var tools = document.querySelector(".nav-tools");
  if (!tools) return;

  var root = document.documentElement;
  var BASE = 16; // matches `html { font-size: 16px }` in typewriter.scss
  var MIN = 12;
  var MAX = 22;

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* private mode etc. — preference just won't persist */
    }
  }

  function currentZoom() {
    return parseInt(root.style.fontSize, 10) || BASE;
  }

  function setZoom(px) {
    px = Math.min(MAX, Math.max(MIN, px));
    if (px === BASE) {
      // Back at the stylesheet default: drop the override entirely.
      root.style.fontSize = "";
      store("zoom", null);
    } else {
      root.style.fontSize = px + "px";
      store("zoom", String(px));
    }
  }

  // theme: "light" | "dark" forces a palette; null follows the OS setting.
  function setTheme(theme) {
    if (theme) {
      root.setAttribute("data-theme", theme);
      store("theme", theme);
    } else {
      root.removeAttribute("data-theme");
      store("theme", null);
    }
    syncPressed();
  }

  function syncPressed() {
    var theme = root.getAttribute("data-theme");
    ["light", "dark"].forEach(function (name) {
      var btn = tools.querySelector('[data-action="' + name + '"]');
      if (btn) btn.setAttribute("aria-pressed", String(theme === name));
    });
  }

  tools.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "zoom-in") setZoom(currentZoom() + 1);
    else if (action === "zoom-out") setZoom(currentZoom() - 1);
    // Pressing the active theme again returns to the OS preference.
    else if (action === "light" || action === "dark")
      setTheme(root.getAttribute("data-theme") === action ? null : action);
  });

  tools.hidden = false;
  syncPressed();
})();
