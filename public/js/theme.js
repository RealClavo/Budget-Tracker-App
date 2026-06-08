(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function getStorageTheme() {
    return namespace.storage ? namespace.storage.getTheme() : "dark";
  }

  function applyTheme(theme) {
    // Alleen light en dark zijn toegestaan. Onbekende waarden vallen terug naar
    // dark, zodat corrupte LocalStorage geen half thema veroorzaakt.
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (namespace.storage) {
      namespace.storage.setTheme(nextTheme);
    }
    const themeSelect = document.querySelector("[data-theme-select]");
    if (themeSelect) {
      // Als Settings openstaat, houden we de select synchroon met de headerknop.
      themeSelect.value = nextTheme;
    }
    document.dispatchEvent(new CustomEvent("cashcontrol:theme-changed", { detail: { theme: nextTheme } }));
    return nextTheme;
  }

  function toggleTheme() {
    return applyTheme(getStorageTheme() === "light" ? "dark" : "light");
  }

  function initTheme() {
    // Het thema wordt zo vroeg mogelijk bij DOMContentLoaded gezet, voordat de
    // gebruiker met formulieren of navigatie werkt.
    applyTheme(getStorageTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", toggleTheme);
    });
  }

  document.addEventListener("DOMContentLoaded", initTheme);

  namespace.theme = {
    applyTheme,
    toggleTheme
  };
})();
