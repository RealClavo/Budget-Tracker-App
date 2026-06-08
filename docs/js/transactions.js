(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  const storage = namespace.storage;
  const validTypes = ["income", "expense"];

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function getCategoriesForType(type) {
    return type === "income" ? storage.incomeCategories : storage.expenseCategories;
  }

  function getAllCategories() {
    return Array.from(new Set([...storage.expenseCategories, ...storage.incomeCategories]));
  }

  function getTodayString() {
    return formatDateForInput(new Date());
  }

  function parseLocalDate(value) {
    const [year, month, day] = String(value || "")
      .split("-")
      .map(Number);
    return new Date(year, month - 1, day);
  }

  function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function isSameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat(namespace.storage.getLanguage() === "en" ? "en-US" : "nl-NL", {
        style: "currency",
        currency: storage.validateCurrency(currency) ? currency : "EUR"
      }).format(amount);
    } catch (error) {
      return `${currency || "EUR"} ${Number(amount || 0).toFixed(2)}`;
    }
  }

  function formatDisplayDate(value) {
    if (!isValidDate(value)) {
      return value;
    }
    try {
      return new Intl.DateTimeFormat(namespace.storage.getLanguage() === "en" ? "en-US" : "nl-NL", {
        dateStyle: "medium"
      }).format(parseLocalDate(value));
    } catch (error) {
      return value;
    }
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

  function deleteTransaction(id) {
    const transactions = storage.getTransactions();
    const nextTransactions = transactions.filter((transaction) => transaction.id !== id);
    const saved = storage.setTransactions(nextTransactions);
    if (saved) {
      document.dispatchEvent(new CustomEvent("cashcontrol:transactions-changed"));
    }
    return saved;
  }

  function clearTransactions() {
    const saved = storage.setTransactions([]);
    if (saved) {
      document.dispatchEvent(new CustomEvent("cashcontrol:transactions-changed"));
    }
    return saved;
  }

  function filterTransactions(transactions, filters) {
    const today = new Date();
    const todayString = getTodayString();
    const weekStart = getStartOfWeek(today);

    return transactions.filter((transaction) => {
      if (filters.type !== "all" && transaction.type !== filters.type) {
        return false;
      }

      if (filters.category !== "all" && transaction.category !== filters.category) {
        return false;
      }

      if (filters.period === "today") {
        return transaction.date === todayString;
      }

      if (filters.period === "week") {
        const date = parseLocalDate(transaction.date);
        return Number.isFinite(date.getTime()) && date >= weekStart && date <= today;
      }

      if (filters.period === "month") {
        const date = parseLocalDate(transaction.date);
        return Number.isFinite(date.getTime()) && isSameMonth(date, today);
      }

      return true;
    });
  }

  function getOverviewFilters() {
    return {
      period: document.querySelector("[data-filter-period]")?.value || "all",
      type: document.querySelector("[data-filter-type]")?.value || "all",
      category: document.querySelector("[data-filter-category]")?.value || "all"
    };
  }

  function createTransactionItem(transaction, options) {
    const item = document.createElement("li");
    const main = document.createElement("div");
    const title = document.createElement("p");
    const meta = document.createElement("p");
    const amount = document.createElement("strong");

    item.className = "transaction-item";
    main.className = "transaction-main";
    title.className = "transaction-title";
    meta.className = "transaction-meta";
    amount.className = `transaction-amount is-${transaction.type}`;

    title.textContent = transaction.description;
    meta.textContent = `${formatDisplayDate(transaction.date)} · ${transaction.category} · ${transaction.currency}`;
    amount.textContent = `${transaction.type === "income" ? "+" : "-"} ${formatMoney(transaction.amount, transaction.currency)}`;

    main.append(title, meta);
    item.append(main, amount);

    if (options && options.actions) {
      const actions = document.createElement("div");
      const deleteButton = document.createElement("button");
      actions.className = "transaction-actions";
      deleteButton.className = "small-button";
      deleteButton.type = "button";
      deleteButton.textContent = translate("actions.delete", "Wissen");
      deleteButton.addEventListener("click", () => {
        const confirmed = window.confirm(translate("messages.confirmDelete", "Weet je zeker dat je deze transactie wilt wissen?"));
        if (confirmed) {
          deleteTransaction(transaction.id);
        }
      });
      actions.append(deleteButton);
      item.append(actions);
    }

    return item;
  }

  function populateOverviewCategoryFilter() {
    const select = document.querySelector("[data-filter-category]");
    if (!select) {
      return;
    }

    replaceOptions(
      select,
      [
        { value: "all", label: translate("filters.allCategories", "Alle categorieen") },
        ...getAllCategories().map((category) => ({
          value: category,
          label: category
        }))
      ],
      select.value || "all"
    );
  }

  function renderOverview() {
    const list = document.querySelector("[data-transaction-list]");
    if (!list) {
      return;
    }

    const empty = document.querySelector("[data-overview-empty]");
    const count = document.querySelector("[data-overview-count]");
    const filtered = filterTransactions(storage.getTransactions(), getOverviewFilters());

    list.replaceChildren();
    filtered.forEach((transaction) => {
      list.append(createTransactionItem(transaction, { actions: true }));
    });

    if (empty) {
      empty.classList.toggle("is-hidden", filtered.length > 0);
    }

    if (count) {
      count.textContent = String(filtered.length);
    }
  }

  function hydrateOverview() {
    if (!document.querySelector("[data-transaction-list]")) {
      return;
    }

    populateOverviewCategoryFilter();
    ["[data-filter-period]", "[data-filter-type]", "[data-filter-category]"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("change", renderOverview);
    });

    document.querySelector("[data-clear-transactions]")?.addEventListener("click", () => {
      const confirmed = window.confirm(translate("messages.confirmClearTransactions", "Alle transacties wissen? Dit kan niet ongedaan worden gemaakt."));
      if (confirmed) {
        clearTransactions();
      }
    });

    document.addEventListener("cashcontrol:transactions-changed", renderOverview);
    renderOverview();
  }

  function setStatus(element, message, type) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-error", type === "error");
  }

  function handleTransactionFormSubmit(event) {
    if (event) {
      if (event.cashControlHandled) {
        return;
      }
      event.cashControlHandled = true;
      event.preventDefault();
    }

    const eventTarget = event && event.currentTarget;
    const form =
      eventTarget && eventTarget.matches && eventTarget.matches("[data-transaction-form]")
        ? eventTarget
        : eventTarget && eventTarget.closest
          ? eventTarget.closest("[data-transaction-form]")
          : document.querySelector("[data-transaction-form]");

    if (!form) {
      return;
    }

    const status = form.querySelector("[data-form-status]");
    const dateInput = form.elements.namedItem("date");
    const categorySelect = form.querySelector("[data-category-select]");
    const currencySelect = form.querySelector("[data-currency-select]");
    const result = validateTransaction(new FormData(form));

    if (result.error) {
      setStatus(status, result.error, "error");
      return;
    }

    if (!saveTransaction(result.value)) {
      setStatus(status, translate("messages.storageError", "Opslaan is mislukt. Controleer browseropslag."), "error");
      return;
    }

    form.dataset.preserveStatus = "true";
    form.reset();
    window.setTimeout(() => {
      dateInput.value = formatDateForInput(new Date());
      populateCurrencySelect(currencySelect, result.value.currency);
      populateCategorySelect(categorySelect, getSelectedTransactionType(form));
    });
    setStatus(status, translate("messages.transactionSaved", "Transactie opgeslagen."), "success");
  }

  function hydrateTransactionForm() {
    const form = document.querySelector("[data-transaction-form]");
    if (!form) {
      return;
    }

    const status = form.querySelector("[data-form-status]");
    const dateInput = form.elements.namedItem("date");
    const categorySelect = form.querySelector("[data-category-select]");
    const currencySelect = form.querySelector("[data-currency-select]");
    const typeInputs = Array.from(form.querySelectorAll('input[name="type"]'));

    if (!dateInput.value) {
      dateInput.value = formatDateForInput(new Date());
    }

    populateCurrencySelect(currencySelect);
    populateCategorySelect(categorySelect, getSelectedTransactionType(form));

    typeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        populateCategorySelect(categorySelect, getSelectedTransactionType(form));
      });
    });

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        const preserveStatus = form.dataset.preserveStatus === "true";
        delete form.dataset.preserveStatus;
        dateInput.value = formatDateForInput(new Date());
        populateCurrencySelect(currencySelect);
        populateCategorySelect(categorySelect, getSelectedTransactionType(form));
        if (!preserveStatus) {
          setStatus(status, "", "");
        }
      });
    });

    form.addEventListener("submit", handleTransactionFormSubmit);
    form.querySelector("[data-transaction-submit]")?.addEventListener("click", handleTransactionFormSubmit);
  }

  function getSelectedTransactionType(form) {
    return form.querySelector('input[name="type"]:checked')?.value || "expense";
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrateTransactionForm();
    hydrateOverview();
  });

  namespace.transactions = {
    validTypes,
    isValidDate,
    getCategoriesForType,
    getAllCategories,
    formatMoney,
    formatDisplayDate,
    populateCurrencySelect,
    populateCategorySelect,
    createTransactionItem,
    filterTransactions,
    validateTransaction,
    saveTransaction,
    handleTransactionFormSubmit,
    deleteTransaction,
    clearTransactions,
    renderOverview,
    setStatus
  };
})();
