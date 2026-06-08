(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  const cache = {};
  let currentLanguage = "nl";
  let translations = {};

  function resolveKey(key, fallback) {
    // Vertalingen gebruiken punt-notatie zoals pages.dashboard.title. Deze
    // resolver loopt door het JSON-object zonder eval of dynamische code.
    const value = key.split(".").reduce((cursor, part) => (cursor && typeof cursor === "object" ? cursor[part] : undefined), translations);
    return typeof value === "string" ? value : fallback || key;
  }

  async function loadLanguage(language) {
    const nextLanguage = language === "en" ? "en" : "nl";
    if (!cache[nextLanguage]) {
      // Taalbestanden worden pas opgehaald wanneer ze nodig zijn. Daarna blijven
      // ze in memory cache zodat wisselen tussen NL/EN snel blijft.
      const response = await fetch(`./i18n/${nextLanguage}.json`, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error("Translations unavailable");
      }
      cache[nextLanguage] = await response.json();
    }
    currentLanguage = nextLanguage;
    translations = cache[nextLanguage];
    document.documentElement.lang = nextLanguage;
    // Naast de algemene settings bewaren we de taal ook apart, zoals gevraagd in
    // het datamodel. Daardoor kan de taalmodule zelfstandig initialiseren.
    namespace.storage.setLanguage(nextLanguage);
    return translations;
  }

  function applyTranslations(root) {
    const scope = root || document;
    // Alleen elementen met data-i18n worden aangepast. Dynamische transactiedata
    // blijft buiten het vertaalsysteem en wordt apart met textContent gerenderd.
    scope.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = resolveKey(element.dataset.i18n, element.textContent);
    });
  }

  async function setLanguage(language) {
    try {
      await loadLanguage(language);
      applyTranslations(document);
      const languageSelect = document.querySelector("[data-language-select]");
      if (languageSelect) {
        languageSelect.value = currentLanguage;
      }
      // Andere modules formatteren bedragen/datums opnieuw zodra de taal wisselt.
      document.dispatchEvent(new CustomEvent("cashcontrol:language-changed", { detail: { language: currentLanguage } }));
    } catch (error) {
      // Als een taalbestand niet laadt, blijft de app bruikbaar in Nederlands.
      currentLanguage = "nl";
    }
  }

  function t(key, fallback) {
    return resolveKey(key, fallback);
  }

  function initI18n() {
    setLanguage(namespace.storage.getLanguage());
  }

  document.addEventListener("DOMContentLoaded", initI18n);

  namespace.i18n = {
    t,
    setLanguage,
    applyTranslations,
    getLanguage: () => currentLanguage
  };
})();
