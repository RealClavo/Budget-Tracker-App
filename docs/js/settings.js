(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function setStatus(element, message, type) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-error", type === "error");
  }

  function populateCurrencySelect(select, selectedValue) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    // De valuta-opties komen uit storage.js, zodat instellingen, transacties en
    // converter exact dezelfde toegestane valuta gebruiken.
    namespace.storage.currencies.forEach((currency) => {
      const option = document.createElement("option");
      option.value = currency;
      option.textContent = currency;
      select.append(option);
    });
    select.value = selectedValue;
  }

  function hydrateSettingsForm() {
    const form = document.querySelector("[data-settings-form]");
    if (!form) {
      return;
    }

    const status = document.querySelector("[data-settings-status]");
    const settings = namespace.storage.getSettings();
    // Bij openen van Settings vullen we het formulier vanuit LocalStorage. De UI
    // is daardoor altijd een weergave van de huidige opgeslagen voorkeuren.
    form.elements.language.value = namespace.storage.getLanguage();
    form.elements.theme.value = namespace.storage.getTheme();
    form.elements.monthlyBudget.value = Number(settings.monthlyBudget || 0).toFixed(2);
    populateCurrencySelect(form.querySelector("[data-default-currency]"), settings.defaultCurrency);

    form.elements.language.addEventListener("change", () => {
      // Taal wisselt direct voor feedback; de submitknop bewaart daarna de rest
      // van de instellingen zoals valuta en maandbudget.
      namespace.i18n.setLanguage(form.elements.language.value);
    });

    form.elements.theme.addEventListener("change", () => {
      // Thema wisselt direct, zodat de gebruiker meteen ziet wat licht/donker doet.
      namespace.theme.applyTheme(form.elements.theme.value);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const monthlyBudget = Number(form.elements.monthlyBudget.value || 0);
      const defaultCurrency = form.elements.defaultCurrency.value;

      if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0 || !namespace.storage.validateCurrency(defaultCurrency)) {
        setStatus(status, translate("messages.invalidSettings", "Controleer je instellingen."), "error");
        return;
      }

      namespace.storage.setSettings({
        defaultCurrency,
        monthlyBudget
      });
      // Taal en thema worden ook via hun eigen modules gezet, omdat die modules
      // extra DOM-updates en events uitvoeren naast alleen LocalStorage schrijven.
      await namespace.i18n.setLanguage(form.elements.language.value);
      namespace.theme.applyTheme(form.elements.theme.value);
      document.dispatchEvent(new CustomEvent("cashcontrol:settings-changed"));
      setStatus(status, translate("messages.settingsSaved", "Instellingen opgeslagen."), "success");
    });

    document.querySelector("[data-clear-app-data]")?.addEventListener("click", () => {
      const confirmed = window.confirm(translate("messages.confirmClearAppData", "Alle CashControl data wissen? Dit kan niet ongedaan worden gemaakt."));
      if (!confirmed) {
        return;
      }
      // Clear all wist transacties, budget, thema, taal en cache. Daarna zetten
      // we basisvoorkeuren terug zodat de app direct bruikbaar blijft.
      namespace.storage.clearAll();
      namespace.storage.setLanguage(form.elements.language.value);
      namespace.storage.setTheme(form.elements.theme.value);
      namespace.storage.setSettings(namespace.storage.defaultSettings);
      namespace.storage.setBudget(namespace.storage.defaultBudget);
      form.elements.defaultCurrency.value = namespace.storage.defaultSettings.defaultCurrency;
      form.elements.monthlyBudget.value = Number(namespace.storage.defaultSettings.monthlyBudget).toFixed(2);
      setStatus(status, translate("messages.appDataCleared", "Alle appdata is gewist."), "success");
      // Alle afgeleide schermen krijgen een update-event, zodat dashboard,
      // statistieken en calculator niet verouderde waarden blijven tonen.
      document.dispatchEvent(new CustomEvent("cashcontrol:transactions-changed"));
      document.dispatchEvent(new CustomEvent("cashcontrol:settings-changed"));
      document.dispatchEvent(new CustomEvent("cashcontrol:budget-changed"));
    });

    document.addEventListener("cashcontrol:language-changed", () => {
      form.elements.language.value = namespace.storage.getLanguage();
    });
    document.addEventListener("cashcontrol:theme-changed", () => {
      form.elements.theme.value = namespace.storage.getTheme();
    });
  }

  document.addEventListener("DOMContentLoaded", hydrateSettingsForm);

  namespace.settings = {
    hydrateSettingsForm
  };
})();
