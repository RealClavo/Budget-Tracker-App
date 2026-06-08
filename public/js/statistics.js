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

  function formatMoney(amount) {
    return namespace.app && typeof namespace.app.formatMoney === "function"
      ? namespace.app.formatMoney(amount, namespace.storage.getSettings().defaultCurrency)
      : `${namespace.storage.getSettings().defaultCurrency} ${Number(amount || 0).toFixed(2)}`;
  }

  function createEmptyChartMessage() {
    // De grafiekcontainers blijven zichtbaar wanneer er nog geen transacties
    // zijn; dit voorkomt lege vlakken en maakt duidelijk dat er eerst data nodig is.
    const element = document.createElement("p");
    element.className = "chart-empty";
    element.textContent = translate("statistics.noData", "Nog geen gegevens om te tonen.");
    return element;
  }

  function createChartRow(label, amount, percentage, className) {
    // Elke chart row is gewone HTML/CSS in plaats van Chart.js. Dat houdt de app
    // kleiner, offline-vriendelijker en makkelijker uit te leggen in een review.
    const row = document.createElement("div");
    const header = document.createElement("div");
    const labelElement = document.createElement("span");
    const amountElement = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("span");

    row.className = "chart-row";
    header.className = "chart-label";
    track.className = "chart-track";
    fill.className = className ? `chart-fill ${className}` : "chart-fill";

    labelElement.textContent = label;
    amountElement.textContent = formatMoney(amount);
    // Clamp naar 0-100 zodat een foutieve berekening of lege dataset de layout
    // niet buiten de chart-track trekt.
    fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;

    header.append(labelElement, amountElement);
    track.append(fill);
    row.append(header, track);
    return row;
  }

  function renderCategoryChart(transactions) {
    const chart = document.querySelector("[data-category-chart]");
    if (!chart) {
      return;
    }

    const totals = namespace.calculations.getCategoryExpenseTotals(transactions);
    const entries = Object.entries(totals).sort((left, right) => right[1] - left[1]);
    // De grootste categorie wordt 100%; alle andere balken worden relatief
    // daaraan geschaald. Zo blijft de grafiek leesbaar bij kleine bedragen.
    const max = entries.reduce((highest, [, amount]) => Math.max(highest, amount), 0);

    chart.replaceChildren();
    if (entries.length === 0) {
      chart.append(createEmptyChartMessage());
      return;
    }

    entries.forEach(([category, amount]) => {
      chart.append(createChartRow(category, amount, max > 0 ? (amount / max) * 100 : 0));
    });
  }

  function renderIncomeExpenseChart(transactions) {
    const chart = document.querySelector("[data-income-expense-chart]");
    if (!chart) {
      return;
    }

    const income = namespace.calculations.getTotalIncome(transactions);
    const expenses = namespace.calculations.getTotalExpenses(transactions);
    // Voor de vergelijking gebruiken we de grootste van inkomsten/uitgaven als
    // referentie, zodat beide balken in dezelfde schaal staan.
    const max = Math.max(income, expenses);

    chart.replaceChildren();
    if (max <= 0) {
      chart.append(createEmptyChartMessage());
      return;
    }

    chart.append(createChartRow(translate("types.income", "Inkomst"), income, (income / max) * 100, "is-income"));
    chart.append(createChartRow(translate("types.expense", "Uitgave"), expenses, (expenses / max) * 100, "is-expense"));
  }

  function renderStatistics() {
    if (!document.querySelector("[data-stats-income]")) {
      return;
    }

    const transactions = namespace.storage.getTransactions();
    const calculations = namespace.calculations;
    const highest = calculations.getHighestSpendingCategory(transactions);

    setText("[data-stats-income]", formatMoney(calculations.getTotalIncome(transactions)));
    setText("[data-stats-expenses]", formatMoney(calculations.getTotalExpenses(transactions)));
    setText("[data-stats-average]", formatMoney(calculations.getAverageDailySpending(transactions)));
    setText("[data-stats-highest]", highest.category);
    renderCategoryChart(transactions);
    renderIncomeExpenseChart(transactions);
  }

  function initStatistics() {
    renderStatistics();
    // Statistieken zijn afgeleid van LocalStorage. Daarom renderen we opnieuw
    // wanneer transacties, instellingen of taal veranderen.
    document.addEventListener("cashcontrol:transactions-changed", renderStatistics);
    document.addEventListener("cashcontrol:settings-changed", renderStatistics);
    document.addEventListener("cashcontrol:language-changed", renderStatistics);
  }

  document.addEventListener("DOMContentLoaded", initStatistics);

  namespace.statistics = {
    renderStatistics,
    renderCategoryChart,
    renderIncomeExpenseChart
  };
})();
