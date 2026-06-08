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
    form.elements.language.value = namespace.storage.getLanguage();
    form.elements.theme.value = namespace.storage.getTheme();
    form.elements.monthlyBudget.value = Number(settings.monthlyBudget || 0).toFixed(2);
    populateCurrencySelect(form.querySelector("[data-default-currency]"), settings.defaultCurrency);

    form.elements.language.addEventListener("change", () => {
      namespace.i18n.setLanguage(form.elements.language.value);
    });

    form.elements.theme.addEventListener("change", () => {
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
      namespace.storage.clearAll();
      namespace.storage.setLanguage(form.elements.language.value);
      namespace.storage.setTheme(form.elements.theme.value);
      namespace.storage.setSettings(namespace.storage.defaultSettings);
      namespace.storage.setBudget(namespace.storage.defaultBudget);
      form.elements.defaultCurrency.value = namespace.storage.defaultSettings.defaultCurrency;
      form.elements.monthlyBudget.value = Number(namespace.storage.defaultSettings.monthlyBudget).toFixed(2);
      setStatus(status, translate("messages.appDataCleared", "Alle appdata is gewist."), "success");
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
