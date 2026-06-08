(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  const apiBaseUrl = "https://api.frankfurter.dev/v2/rates";

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function formatMoney(amount, currency) {
    return namespace.transactions && typeof namespace.transactions.formatMoney === "function"
      ? namespace.transactions.formatMoney(amount, currency)
      : `${currency} ${Number(amount || 0).toFixed(2)}`;
  }

  function cacheKey(from, to) {
    return `${from}_${to}`;
  }

  function buildRatesUrl(from, to) {
    return `${apiBaseUrl}?base=${encodeURIComponent(from)}&quotes=${encodeURIComponent(to)}`;
  }

  function getCachedRate(from, to) {
    return namespace.storage.getCachedRates()[cacheKey(from, to)] || null;
  }

  function setCachedRate(from, to, rate) {
    const cachedRates = namespace.storage.getCachedRates();
    cachedRates[cacheKey(from, to)] = {
      from,
      to,
      rate,
      fetchedAt: new Date().toISOString()
    };
    namespace.storage.setCachedRates(cachedRates);
  }

  function setStatus(element, message, type) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-error", type === "error");
  }

  function populateCurrencyOptions(select, selectedValue) {
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

  function renderConversion(amount, from, to, rate, cached) {
    const result = document.querySelector("[data-converter-result]");
    const rateElement = document.querySelector("[data-converter-rate]");
    const convertedAmount = amount * rate;

    if (result) {
      result.textContent = formatMoney(convertedAmount, to);
    }

    if (rateElement) {
      const label = `${formatMoney(1, from)} = ${formatMoney(rate, to)}`;
      rateElement.textContent = cached ? `${label} (${translate("converter.cached", "opgeslagen koers")})` : label;
    }
  }

  async function fetchRate(from, to) {
    if (from === to) {
      return { rate: 1, cached: false };
    }

    const response = await fetch(buildRatesUrl(from, to), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Frankfurter API unavailable");
    }

    const data = await response.json();
    const rate = readRateFromResponse(data, to);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid exchange rate");
    }

    setCachedRate(from, to, rate);
    return { rate, cached: false };
  }

  function readRateFromResponse(data, to) {
    if (Array.isArray(data)) {
      const matchingRate = data.find((item) => item && String(item.quote || "").toUpperCase() === to);
      return Number(matchingRate && matchingRate.rate);
    }

    if (data && data.rates && typeof data.rates === "object") {
      return Number(data.rates[to]);
    }

    return Number(data && data.rate);
  }

  async function convertCurrency(amount, from, to) {
    if (!window.navigator.onLine) {
      const cachedRate = getCachedRate(from, to);
      if (cachedRate) {
        return { rate: cachedRate.rate, cached: true, offline: true };
      }
      throw new Error("offline-without-cache");
    }

    try {
      return await fetchRate(from, to);
    } catch (error) {
      const cachedRate = getCachedRate(from, to);
      if (cachedRate) {
        return { rate: cachedRate.rate, cached: true, offline: false };
      }
      throw error;
    }
  }

  function hydrateConverter() {
    const form = document.querySelector("[data-converter-form]");
    if (!form) {
      return;
    }

    const status = document.querySelector("[data-converter-status]");
    const fromSelect = form.querySelector("[data-converter-from]");
    const toSelect = form.querySelector("[data-converter-to]");
    const defaultCurrency = namespace.storage.getSettings().defaultCurrency || "EUR";
    populateCurrencyOptions(fromSelect, defaultCurrency);
    populateCurrencyOptions(toSelect, defaultCurrency === "USD" ? "EUR" : "USD");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const amount = Number(form.elements.amount.value);
      const from = String(form.elements.from.value || "").toUpperCase();
      const to = String(form.elements.to.value || "").toUpperCase();

      if (!Number.isFinite(amount) || amount <= 0) {
        setStatus(status, translate("messages.invalidAmount", "Bedrag moet een positief getal zijn."), "error");
        return;
      }

      if (!namespace.storage.validateCurrency(from) || !namespace.storage.validateCurrency(to)) {
        setStatus(status, translate("messages.invalidCurrency", "Kies een geldige valuta."), "error");
        return;
      }

      setStatus(status, translate("converter.loading", "Wisselkoers ophalen..."), "");

      try {
        const conversion = await convertCurrency(amount, from, to);
        renderConversion(amount, from, to, conversion.rate, conversion.cached);

        if (conversion.offline) {
          setStatus(status, "Offline modus: laatste opgeslagen wisselkoers wordt gebruikt.", "success");
        } else if (conversion.cached) {
          setStatus(status, translate("converter.cachedFallback", "API niet bereikbaar. Laatste opgeslagen wisselkoers wordt gebruikt."), "success");
        } else {
          setStatus(status, translate("converter.success", "Wisselkoers bijgewerkt."), "success");
        }
      } catch (error) {
        const message =
          error.message === "offline-without-cache"
            ? translate("converter.noCachedRate", "Offline en nog geen opgeslagen wisselkoers beschikbaar.")
            : translate("converter.error", "Wisselkoers ophalen is mislukt. Probeer het later opnieuw.");
        setStatus(status, message, "error");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", hydrateConverter);

  namespace.currency = {
    buildRatesUrl,
    readRateFromResponse,
    getCachedRate,
    setCachedRate,
    convertCurrency
  };
})();
