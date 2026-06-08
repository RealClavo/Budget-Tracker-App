(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  const storage = namespace.storage;
  const validTypes = ["income", "expense"];

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function formatDateForInput(date) {
    return date.toISOString().slice(0, 10);
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isFinite(date.getTime()) && formatDateForInput(date) === value;
  }

  function getCategoriesForType(type) {
    return type === "income" ? storage.incomeCategories : storage.expenseCategories;
  }

  function getAllCategories() {
    return Array.from(new Set([...storage.expenseCategories, ...storage.incomeCategories]));
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function replaceOptions(select, options, selectedValue) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    options.forEach((option) => {
      select.append(createOption(option.value, option.label));
    });
    if (selectedValue) {
      select.value = selectedValue;
    }
  }

  function populateCurrencySelect(select, selectedValue) {
    const fallbackCurrency = selectedValue || storage.getSettings().defaultCurrency || "EUR";
    replaceOptions(
      select,
      storage.currencies.map((currency) => ({
        value: currency,
        label: currency
      })),
      fallbackCurrency
    );
  }

  function populateCategorySelect(select, type, selectedValue) {
    const categories = getCategoriesForType(type);
    replaceOptions(
      select,
      categories.map((category) => ({
        value: category,
        label: category
      })),
      selectedValue && categories.includes(selectedValue) ? selectedValue : categories[0]
    );
  }

  function validateTransaction(formData) {
    const type = String(formData.get("type") || "").trim();
    const category = storage.sanitizeText(formData.get("category"), 40);
    const description = storage.sanitizeText(formData.get("description"), 80);
    const currency = String(formData.get("currency") || "").toUpperCase();
    const date = String(formData.get("date") || "").trim();
    const amount = Number(formData.get("amount"));
    const categories = getCategoriesForType(type);

    if (!isValidDate(date)) {
      return { error: translate("messages.invalidDate", "Vul een geldige datum in.") };
    }

    if (!validTypes.includes(type)) {
      return { error: translate("messages.invalidType", "Kies inkomsten of uitgaven.") };
    }

    if (!categories.includes(category)) {
      return { error: translate("messages.invalidCategory", "Kies een geldige categorie.") };
    }

    if (!description || description.length > 80) {
      return { error: translate("messages.invalidDescription", "Vul een omschrijving in van maximaal 80 tekens.") };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: translate("messages.invalidAmount", "Bedrag moet een positief getal zijn.") };
    }

    if (!storage.validateCurrency(currency)) {
      return { error: translate("messages.invalidCurrency", "Kies een geldige valuta.") };
    }

    return {
      value: {
        id: storage.generateId(),
        date,
        type,
        category,
        description,
        amount: Math.round(amount * 100) / 100,
        currency,
        createdAt: new Date().toISOString()
      }
    };
  }

  function saveTransaction(transaction) {
    const transactions = storage.getTransactions();
    transactions.unshift(transaction);
    const saved = storage.setTransactions(transactions);
    if (saved) {
      document.dispatchEvent(new CustomEvent("cashcontrol:transactions-changed"));
    }
    return saved;
  }

  function setStatus(element, message, type) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-error", type === "error");
  }

  function hydrateTransactionForm() {
    const form = document.querySelector("[data-transaction-form]");
    if (!form) {
      return;
    }

    const status = form.querySelector("[data-form-status]");
    const dateInput = form.elements.date;
    const categorySelect = form.querySelector("[data-category-select]");
    const currencySelect = form.querySelector("[data-currency-select]");
    const typeInputs = Array.from(form.querySelectorAll('input[name="type"]'));

    if (!dateInput.value) {
      dateInput.value = formatDateForInput(new Date());
    }

    populateCurrencySelect(currencySelect);
    populateCategorySelect(categorySelect, form.elements.type.value || "expense");

    typeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        populateCategorySelect(categorySelect, form.elements.type.value);
      });
    });

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        dateInput.value = formatDateForInput(new Date());
        populateCurrencySelect(currencySelect);
        populateCategorySelect(categorySelect, form.elements.type.value || "expense");
        setStatus(status, "", "");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = validateTransaction(new FormData(form));

      if (result.error) {
        setStatus(status, result.error, "error");
        return;
      }

      if (!saveTransaction(result.value)) {
        setStatus(status, translate("messages.storageError", "Opslaan is mislukt. Controleer browseropslag."), "error");
        return;
      }

      form.reset();
      window.setTimeout(() => {
        dateInput.value = formatDateForInput(new Date());
        populateCurrencySelect(currencySelect, result.value.currency);
        populateCategorySelect(categorySelect, form.elements.type.value || "expense");
      });
      setStatus(status, translate("messages.transactionSaved", "Transactie opgeslagen."), "success");
    });
  }

  document.addEventListener("DOMContentLoaded", hydrateTransactionForm);

  namespace.transactions = {
    validTypes,
    isValidDate,
    getCategoriesForType,
    getAllCategories,
    populateCurrencySelect,
    populateCategorySelect,
    validateTransaction,
    saveTransaction,
    setStatus
  };
})();
