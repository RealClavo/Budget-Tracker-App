(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  const keys = {
    transactions: "cashcontrol.transactions",
    settings: "cashcontrol.settings",
    budget: "cashcontrol.budget",
    language: "cashcontrol.language",
    theme: "cashcontrol.theme",
    cachedRates: "cashcontrol.cachedRates"
  };

  const currencies = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "TRY", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF"];
  const expenseCategories = [
    "Boodschappen",
    "Eten & drinken",
    "Huur",
    "Abonnementen",
    "Kleding",
    "Vervoer",
    "Vakantie",
    "School",
    "Entertainment",
    "Overig"
  ];
  const incomeCategories = ["Salaris", "Zakgeld", "Verkoop", "Gift", "Overig"];

  const defaultSettings = {
    defaultCurrency: "EUR",
    monthlyBudget: 0
  };

  const defaultBudget = {
    monthlyIncome: 0,
    fixedCosts: 0,
    savingsGoal: 0,
    plannedSpending: 0
  };

  function safeParseJson(rawValue, fallback) {
    if (typeof rawValue !== "string" || rawValue.length === 0) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(rawValue);
      return parsed === null || typeof parsed === "undefined" ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function read(key, fallback) {
    try {
      return safeParseJson(window.localStorage.getItem(key), fallback);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readArray(key) {
    const value = read(key, []);
    if (Array.isArray(value)) {
      return value;
    }
    write(key, []);
    return [];
  }

  function readObject(key, fallback) {
    const value = read(key, fallback);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    write(key, fallback);
    return fallback;
  }

  function getTransactions() {
    return readArray(keys.transactions);
  }

  function setTransactions(transactions) {
    return write(keys.transactions, Array.isArray(transactions) ? transactions : []);
  }

  function getSettings() {
    return {
      ...defaultSettings,
      ...readObject(keys.settings, defaultSettings),
      defaultCurrency: getDefaultCurrency()
    };
  }

  function setSettings(settings) {
    const nextSettings = {
      ...getSettings(),
      ...settings
    };
    nextSettings.defaultCurrency = validateCurrency(nextSettings.defaultCurrency) ? nextSettings.defaultCurrency : "EUR";
    nextSettings.monthlyBudget = toPositiveNumber(nextSettings.monthlyBudget, 0);
    return write(keys.settings, nextSettings);
  }

  function getBudget() {
    const saved = readObject(keys.budget, defaultBudget);
    return {
      monthlyIncome: toPositiveNumber(saved.monthlyIncome, 0),
      fixedCosts: toPositiveNumber(saved.fixedCosts, 0),
      savingsGoal: toPositiveNumber(saved.savingsGoal, 0),
      plannedSpending: toPositiveNumber(saved.plannedSpending, 0)
    };
  }

  function setBudget(budget) {
    return write(keys.budget, {
      monthlyIncome: toPositiveNumber(budget.monthlyIncome, 0),
      fixedCosts: toPositiveNumber(budget.fixedCosts, 0),
      savingsGoal: toPositiveNumber(budget.savingsGoal, 0),
      plannedSpending: toPositiveNumber(budget.plannedSpending, 0)
    });
  }

  function getLanguage() {
    const language = read(keys.language, "nl");
    return language === "en" ? "en" : "nl";
  }

  function setLanguage(language) {
    return write(keys.language, language === "en" ? "en" : "nl");
  }

  function getTheme() {
    const theme = read(keys.theme, "dark");
    return theme === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    return write(keys.theme, theme === "light" ? "light" : "dark");
  }

  function getCachedRates() {
    return readObject(keys.cachedRates, {});
  }

  function setCachedRates(rates) {
    return write(keys.cachedRates, rates && typeof rates === "object" && !Array.isArray(rates) ? rates : {});
  }

  function clearAll() {
    Object.values(keys).forEach(remove);
  }

  function toPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function validateCurrency(currency) {
    return currencies.includes(String(currency || "").toUpperCase());
  }

  function getDefaultCurrency() {
    const settings = readObject(keys.settings, defaultSettings);
    const currency = String(settings.defaultCurrency || "EUR").toUpperCase();
    return validateCurrency(currency) ? currency : "EUR";
  }

  function sanitizeText(value, maxLength) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  namespace.storage = {
    keys,
    currencies,
    expenseCategories,
    incomeCategories,
    defaultSettings,
    defaultBudget,
    safeParseJson,
    read,
    write,
    remove,
    getTransactions,
    setTransactions,
    getSettings,
    setSettings,
    getBudget,
    setBudget,
    getLanguage,
    setLanguage,
    getTheme,
    setTheme,
    getCachedRates,
    setCachedRates,
    clearAll,
    toPositiveNumber,
    validateCurrency,
    sanitizeText,
    generateId
  };
})();
