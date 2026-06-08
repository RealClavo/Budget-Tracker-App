(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function getStorageTheme() {
    return namespace.storage ? namespace.storage.getTheme() : "dark";
  }

  function applyTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (namespace.storage) {
      namespace.storage.setTheme(nextTheme);
    }
    const themeSelect = document.querySelector("[data-theme-select]");
    if (themeSelect) {
      themeSelect.value = nextTheme;
    }
    document.dispatchEvent(new CustomEvent("cashcontrol:theme-changed", { detail: { theme: nextTheme } }));
    return nextTheme;
  }

  function toggleTheme() {
    return applyTheme(getStorageTheme() === "light" ? "dark" : "light");
  }

  function initTheme() {
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
