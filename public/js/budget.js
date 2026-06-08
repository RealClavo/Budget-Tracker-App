(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function formatMoney(amount) {
    return namespace.app && typeof namespace.app.formatMoney === "function"
      ? namespace.app.formatMoney(amount, namespace.storage.getSettings().defaultCurrency)
      : `${namespace.storage.getSettings().defaultCurrency} ${Number(amount || 0).toFixed(2)}`;
  }

  function getFormNumber(form, name) {
    return Number(form.elements[name]?.value || 0);
  }

  function validateBudget(values) {
    const entries = Object.entries(values);
    const invalid = entries.some(([, value]) => !Number.isFinite(value) || value < 0);
    if (invalid) {
      return translate("messages.invalidBudget", "Vul alleen geldige positieve bedragen in.");
    }
    return "";
  }

  function readBudgetForm(form) {
    return {
      monthlyIncome: getFormNumber(form, "monthlyIncome"),
      fixedCosts: getFormNumber(form, "fixedCosts"),
      savingsGoal: getFormNumber(form, "savingsGoal"),
      plannedSpending: getFormNumber(form, "plannedSpending")
    };
  }

  function fillBudgetForm(form, budget) {
    Object.entries(budget).forEach(([key, value]) => {
      if (form.elements[key]) {
        form.elements[key].value = Number(value || 0).toFixed(2);
      }
    });
  }

  function setStatus(element, message, type) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-error", type === "error");
  }

  function renderBudgetResults(budget) {
    const plan = namespace.calculations.calculateBudgetPlan(budget);
    const remaining = document.querySelector("[data-calc-remaining]");
    const weekly = document.querySelector("[data-calc-weekly]");
    const daily = document.querySelector("[data-calc-daily]");
    const savings = document.querySelector("[data-calc-savings]");

    if (remaining) {
      remaining.textContent = formatMoney(plan.remainingMonthlyBudget);
    }
    if (weekly) {
      weekly.textContent = formatMoney(plan.weeklySpendingLimit);
    }
    if (daily) {
      daily.textContent = formatMoney(plan.dailySpendingLimit);
    }
    if (savings) {
      savings.textContent = `${plan.savingsPercentage}%`;
    }
  }

  function hydrateBudgetCalculator() {
    const form = document.querySelector("[data-budget-form]");
    if (!form) {
      return;
    }

    const status = document.querySelector("[data-budget-status]");
    const savedBudget = namespace.storage.getBudget();
    fillBudgetForm(form, savedBudget);
    renderBudgetResults(savedBudget);

    form.addEventListener("input", () => {
      renderBudgetResults(readBudgetForm(form));
    });

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        renderBudgetResults(namespace.storage.defaultBudget);
        setStatus(status, "", "");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const budget = readBudgetForm(form);
      const error = validateBudget(budget);

      if (error) {
        setStatus(status, error, "error");
        return;
      }

      if (!namespace.storage.setBudget(budget)) {
        setStatus(status, translate("messages.storageError", "Opslaan is mislukt. Controleer browseropslag."), "error");
        return;
      }

      renderBudgetResults(budget);
      setStatus(status, translate("messages.budgetSaved", "Budget opgeslagen."), "success");
      document.dispatchEvent(new CustomEvent("cashcontrol:budget-changed"));
    });
  }

  document.addEventListener("DOMContentLoaded", hydrateBudgetCalculator);

  namespace.budget = {
    readBudgetForm,
    validateBudget,
    renderBudgetResults
  };
})();
