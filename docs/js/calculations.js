(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function sumTransactions(transactions, predicate) {
    return roundMoney(
      transactions.reduce((total, transaction) => {
        if (predicate(transaction)) {
          return total + Number(transaction.amount || 0);
        }
        return total;
      }, 0)
    );
  }

  function getTotalIncome(transactions) {
    return sumTransactions(transactions, (transaction) => transaction.type === "income");
  }

  function getTotalExpenses(transactions) {
    return sumTransactions(transactions, (transaction) => transaction.type === "expense");
  }

  function getCurrentBalance(transactions) {
    return roundMoney(getTotalIncome(transactions) - getTotalExpenses(transactions));
  }

  function getCurrentMonthKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function getMonthlyTransactions(transactions, date) {
    const monthKey = getCurrentMonthKey(date || new Date());
    return transactions.filter((transaction) => String(transaction.date || "").startsWith(monthKey));
  }

  function getMonthlyExpenses(transactions, date) {
    return getTotalExpenses(getMonthlyTransactions(transactions, date));
  }

  function getMonthlyBudgetGoal(settings, budget) {
    const settingsGoal = Number(settings && settings.monthlyBudget);
    if (Number.isFinite(settingsGoal) && settingsGoal > 0) {
      return settingsGoal;
    }

    const monthlyIncome = Number(budget && budget.monthlyIncome) || 0;
    const fixedCosts = Number(budget && budget.fixedCosts) || 0;
    const savingsGoal = Number(budget && budget.savingsGoal) || 0;
    return Math.max(0, roundMoney(monthlyIncome - fixedCosts - savingsGoal));
  }

  function calculateRemainingMonthlyBudget(transactions, settings, budget, date) {
    const monthlyBudgetGoal = getMonthlyBudgetGoal(settings, budget);
    return roundMoney(monthlyBudgetGoal - getMonthlyExpenses(transactions, date));
  }

  function calculateBudgetProgress(transactions, settings, budget, date) {
    const goal = getMonthlyBudgetGoal(settings, budget);
    const used = getMonthlyExpenses(transactions, date);
    if (goal <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round((used / goal) * 100)));
  }

  function getCategoryExpenseTotals(transactions) {
    return transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((totals, transaction) => {
        const category = transaction.category || "Overig";
        totals[category] = roundMoney((totals[category] || 0) + Number(transaction.amount || 0));
        return totals;
      }, {});
  }

  function getHighestSpendingCategory(transactions) {
    const totals = getCategoryExpenseTotals(transactions);
    const entries = Object.entries(totals).sort((left, right) => right[1] - left[1]);
    if (entries.length === 0) {
      return { category: "-", amount: 0 };
    }
    return { category: entries[0][0], amount: entries[0][1] };
  }

  function getAverageDailySpending(transactions, date) {
    const monthlyTransactions = getMonthlyTransactions(transactions, date || new Date());
    const expenses = getTotalExpenses(monthlyTransactions);
    const currentDate = date || new Date();
    const days = Math.max(1, currentDate.getDate());
    return roundMoney(expenses / days);
  }

  function calculateSavingsPercentage(monthlyIncome, savingsGoal) {
    const income = Number(monthlyIncome) || 0;
    const savings = Number(savingsGoal) || 0;
    if (income <= 0) {
      return 0;
    }
    return Math.round((savings / income) * 100);
  }

  function calculateBudgetPlan(budget) {
    const monthlyIncome = Number(budget.monthlyIncome) || 0;
    const fixedCosts = Number(budget.fixedCosts) || 0;
    const savingsGoal = Number(budget.savingsGoal) || 0;
    const plannedSpending = Number(budget.plannedSpending) || 0;
    const remainingMonthlyBudget = roundMoney(monthlyIncome - fixedCosts - savingsGoal - plannedSpending);
    const spendableAmount = Math.max(0, remainingMonthlyBudget);

    return {
      remainingMonthlyBudget,
      weeklySpendingLimit: roundMoney(spendableAmount / 4.345),
      dailySpendingLimit: roundMoney(spendableAmount / 30),
      savingsPercentage: calculateSavingsPercentage(monthlyIncome, savingsGoal)
    };
  }

  namespace.calculations = {
    roundMoney,
    sumTransactions,
    getTotalIncome,
    getTotalExpenses,
    getCurrentBalance,
    getMonthlyTransactions,
    getMonthlyExpenses,
    getMonthlyBudgetGoal,
    calculateRemainingMonthlyBudget,
    calculateBudgetProgress,
    getCategoryExpenseTotals,
    getHighestSpendingCategory,
    getAverageDailySpending,
    calculateSavingsPercentage,
    calculateBudgetPlan
  };
})();
