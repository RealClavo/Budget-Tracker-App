(function () {
  "use strict";

  const namespace = (window.CashControl = window.CashControl || {});
  let serviceWorkerReady = false;
  let installAvailable = false;

  function translate(key, fallback) {
    return namespace.i18n && typeof namespace.i18n.t === "function" ? namespace.i18n.t(key, fallback) : fallback;
  }

  function setInstallStatus(message) {
    const status = document.querySelector("[data-install-status]");
    if (status) {
      status.textContent = message;
    }
  }

  function refreshInstallStatus() {
    // Deze tekst staat op Settings. Het is geen technische debuglog, maar een
    // begrijpelijke status voor de gebruiker tijdens PWA/install testen.
    if (!("serviceWorker" in navigator)) {
      setInstallStatus(translate("pwa.unsupported", "Deze browser ondersteunt service workers niet volledig."));
      return;
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      // Als de app al standalone draait, hoeven we geen install-hint meer te tonen.
      setInstallStatus(translate("pwa.installed", "CashControl draait als geinstalleerde app."));
      return;
    }

    if (installAvailable) {
      // Browsers bepalen zelf wanneer beforeinstallprompt verschijnt; wij bewaren
      // alleen dat signaal zodat Settings een duidelijke hint kan tonen.
      setInstallStatus(translate("pwa.installReady", "Installatie is beschikbaar via je browsermenu."));
      return;
    }

    if (serviceWorkerReady) {
      setInstallStatus(translate("pwa.ready", "Offline ondersteuning is actief na het eerste volledige bezoek."));
      return;
    }

    setInstallStatus(translate("settings.installHint", "Installatie beschikbaar wanneer je browser dit ondersteunt."));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      refreshInstallStatus();
      return;
    }

    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        // Registratie betekent dat de app shell na de eerste volledige load
        // offline beschikbaar kan zijn.
        serviceWorkerReady = true;
        refreshInstallStatus();
      })
      .catch(() => {
        setInstallStatus(translate("pwa.error", "Service worker registreren is mislukt."));
      });
  }

  function initPwa() {
    window.addEventListener("beforeinstallprompt", () => {
      // We tonen geen eigen install-knop, maar leggen wel uit dat installeren via
      // het browsermenu beschikbaar is.
      installAvailable = true;
      refreshInstallStatus();
    });

    window.addEventListener("appinstalled", () => {
      installAvailable = false;
      setInstallStatus(translate("pwa.installed", "CashControl draait als geinstalleerde app."));
    });

    document.addEventListener("cashcontrol:language-changed", refreshInstallStatus);
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", initPwa);

  namespace.pwa = {
    registerServiceWorker,
    refreshInstallStatus
  };
})();
