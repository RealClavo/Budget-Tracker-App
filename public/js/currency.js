(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  const apiBaseUrl = "https://api.frankfurter.dev/v2";

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
    // Frankfurter heeft geen API key nodig. encodeURIComponent houdt de URL
    // veilig als een selectiewaarde ooit wordt aangepast of uitgebreid.
    return `${apiBaseUrl}/rates?base=${encodeURIComponent(from)}&quotes=${encodeURIComponent(to)}`;
  }

  function buildRatePairUrl(from, to) {
    return `${apiBaseUrl}/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
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

    const pairResult = await fetchRateFromUrl(buildRatePairUrl(from, to), to).catch(() => null);
    if (pairResult) {
      setCachedRate(from, to, pairResult);
      return { rate: pairResult, cached: false };
    }

    const rateResult = await fetchRateFromUrl(buildRatesUrl(from, to), to);
    setCachedRate(from, to, rateResult);
    return { rate: rateResult, cached: false };
  }

  async function fetchRateFromUrl(url, to) {
    const response = await fetch(url, {
      cache: "no-store",
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

    return rate;
  }

  function readRateFromResponse(data, to) {
    // De v2 API kan als array terugkomen, terwijl oudere voorbeelden vaak een
    // rates-object tonen. Beide vormen blijven ondersteund zodat de converter
    // minder snel breekt bij kleine API-response verschillen.
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

    // Online proberen we eerst de live koers. Als de API tijdelijk stuk is,
    // gebruikt de app alleen een eerder succesvol opgeslagen koers.
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

  async function handleConverterSubmit(event) {
    if (event) {
      if (event.cashControlHandled) {
        return;
      }
      event.cashControlHandled = true;
      event.preventDefault();
    }

    const eventTarget = event && event.currentTarget;
    const form =
      eventTarget && eventTarget.matches && eventTarget.matches("[data-converter-form]")
        ? eventTarget
        : eventTarget && eventTarget.closest
          ? eventTarget.closest("[data-converter-form]")
          : document.querySelector("[data-converter-form]");

    if (!form) {
      return;
    }

    const status = document.querySelector("[data-converter-status]");
    const amountControl = form.elements.namedItem("amount");
    const fromControl = form.elements.namedItem("from");
    const toControl = form.elements.namedItem("to");
    const amount = Number(amountControl && amountControl.value);
    const from = String((fromControl && fromControl.value) || "").toUpperCase();
    const to = String((toControl && toControl.value) || "").toUpperCase();

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
  }

  function hydrateConverter() {
    const form = document.querySelector("[data-converter-form]");
    if (!form) {
      return;
    }

    const fromSelect = form.querySelector("[data-converter-from]");
    const toSelect = form.querySelector("[data-converter-to]");
    const defaultCurrency = namespace.storage.getSettings().defaultCurrency || "EUR";
    populateCurrencyOptions(fromSelect, defaultCurrency);
    populateCurrencyOptions(toSelect, defaultCurrency === "USD" ? "EUR" : "USD");

    form.addEventListener("submit", handleConverterSubmit);
    form.querySelector("[data-converter-submit]")?.addEventListener("click", handleConverterSubmit);
  }

  document.addEventListener("DOMContentLoaded", hydrateConverter);

  namespace.currency = {
    buildRatesUrl,
    buildRatePairUrl,
    readRateFromResponse,
    getCachedRate,
    setCachedRate,
    convertCurrency,
    handleConverterSubmit
  };
})();
