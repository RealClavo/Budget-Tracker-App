(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function getDisplayCurrency() {
    return namespace.storage.getSettings().defaultCurrency || "EUR";
  }

  function formatMoney(amount, currency) {
    return namespace.transactions && namespace.transactions.formatMoney
      ? namespace.transactions.formatMoney(amount, currency || getDisplayCurrency())
      : `${currency || "EUR"} ${Number(amount || 0).toFixed(2)}`;
  }

  function renderDashboard() {
    if (!document.querySelector("[data-total-income]")) {
      return;
    }

    // Het dashboard leest steeds de actuele LocalStorage staat en rekent daarna
    // alles opnieuw uit. Zo blijven andere pagina's losgekoppeld maar toch sync.
    const transactions = namespace.storage.getTransactions();
    const settings = namespace.storage.getSettings();
    const budget = namespace.storage.getBudget();
    const calculations = namespace.calculations;
    const currency = settings.defaultCurrency || "EUR";
    const totalIncome = calculations.getTotalIncome(transactions);
    const totalExpenses = calculations.getTotalExpenses(transactions);
    const balance = calculations.getCurrentBalance(transactions);
    const remainingBudget = calculations.calculateRemainingMonthlyBudget(transactions, settings, budget);
    const progress = calculations.calculateBudgetProgress(transactions, settings, budget);
    const highest = calculations.getHighestSpendingCategory(transactions);
    const average = calculations.getAverageDailySpending(transactions);

    setText("[data-total-income]", formatMoney(totalIncome, currency));
    setText("[data-total-expenses]", formatMoney(totalExpenses, currency));
    setText("[data-current-balance]", formatMoney(balance, currency));
    setText("[data-remaining-budget]", formatMoney(remainingBudget, currency));
    setText("[data-budget-percent]", `${progress}%`);
    setText("[data-transaction-count]", String(transactions.length));
    setText("[data-dashboard-highest-category]", highest.category);
    setText("[data-dashboard-average-daily]", formatMoney(average, currency));

    const progressBar = document.querySelector("[data-budget-progress]");
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    renderRecentTransactions(transactions.slice(0, 5));
  }

  function renderRecentTransactions(transactions) {
    const list = document.querySelector("[data-recent-transactions]");
    if (!list || !namespace.transactions) {
      return;
    }

    const empty = document.querySelector("[data-dashboard-empty]");
    list.replaceChildren();
    transactions.forEach((transaction) => {
      list.append(namespace.transactions.createTransactionItem(transaction));
    });

    if (empty) {
      empty.classList.toggle("is-hidden", transactions.length > 0);
    }
  }

  function updateOnlineStatus() {
    const status = document.querySelector("[data-online-status]");
    if (!status) {
      return;
    }
    const online = window.navigator.onLine;
    status.textContent = online ? translate("status.online", "Online") : translate("status.offline", "Offline");
    status.classList.toggle("is-offline", !online);
  }

  function initDashboard() {
    renderDashboard();
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    document.addEventListener("cashcontrol:transactions-changed", renderDashboard);
    document.addEventListener("cashcontrol:settings-changed", renderDashboard);
    document.addEventListener("cashcontrol:budget-changed", renderDashboard);
    document.addEventListener("cashcontrol:language-changed", () => {
      renderDashboard();
      updateOnlineStatus();
    });
  }

  document.addEventListener("DOMContentLoaded", initDashboard);

  namespace.app = {
    renderDashboard,
    updateOnlineStatus,
    formatMoney
  };
})();
