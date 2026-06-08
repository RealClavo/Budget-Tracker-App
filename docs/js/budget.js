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
    // Lege velden tellen als 0. Dat maakt live previewen tijdens typen rustiger,
    // omdat de resultaten niet meteen kapot gaan wanneer een veld tijdelijk leeg is.
    return Number(form.elements[name]?.value || 0);
  }

  function validateBudget(values) {
    // De calculator accepteert alleen nul of positieve bedragen. Schulden of
    // roodstand worden in deze schoolversie niet als apart budgetmodel behandeld.
    const entries = Object.entries(values);
    const invalid = entries.some(([, value]) => !Number.isFinite(value) || value < 0);
    if (invalid) {
      return translate("messages.invalidBudget", "Vul alleen geldige positieve bedragen in.");
    }
    return "";
  }

  function readBudgetForm(form) {
    // Deze functie vertaalt HTML-formvelden naar het simpele budget-object dat
    // ook in LocalStorage wordt opgeslagen onder cashcontrol.budget.
    return {
      monthlyIncome: getFormNumber(form, "monthlyIncome"),
      fixedCosts: getFormNumber(form, "fixedCosts"),
      savingsGoal: getFormNumber(form, "savingsGoal"),
      plannedSpending: getFormNumber(form, "plannedSpending")
    };
  }

  function fillBudgetForm(form, budget) {
    // Bij openen van de calculator worden opgeslagen waarden teruggezet, zodat
    // gebruikers hun maandplanning kunnen aanpassen in plaats van opnieuw te typen.
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
    // Resultaten worden opnieuw berekend bij elke input en na opslaan. De
    // rekenregels zelf staan in calculations.js, zodat dashboard/statistiek
    // dezelfde basisfuncties kunnen hergebruiken.
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
      // Live feedback: de gebruiker ziet direct wat vaste kosten of spaardoel
      // doen met dag- en weeklimiet, nog voordat er opgeslagen wordt.
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
      // Andere modules luisteren naar dit event. Het dashboard kan daardoor zijn
      // maandbudget voortgang updaten zonder de pagina te herladen.
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
