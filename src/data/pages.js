// Centrale paginaconfiguratie voor de hele app.
// Deze lijst wordt op drie plekken gebruikt: Express-routes tijdens development,
// de navigatiebalk in de EJS-layout en de statische HTML-output in docs/.
// Daardoor hoeft een nieuwe pagina maar hier te worden toegevoegd.
const pages = [
  {
    id: "dashboard",
    label: "Dashboard",
    titleKey: "pages.dashboard.title",
    navKey: "nav.dashboard",
    route: "/index.html",
    output: "index.html",
    template: "pages/index",
    icon: "home"
  },
  {
    id: "add",
    label: "Add Transaction",
    titleKey: "pages.add.title",
    navKey: "nav.add",
    route: "/add.html",
    output: "add.html",
    template: "pages/add",
    icon: "plus"
  },
  {
    id: "overview",
    label: "Overview",
    titleKey: "pages.overview.title",
    navKey: "nav.overview",
    route: "/overview.html",
    output: "overview.html",
    template: "pages/overview",
    icon: "list"
  },
  {
    id: "calculator",
    label: "Budget Calculator",
    titleKey: "pages.calculator.title",
    navKey: "nav.calculator",
    route: "/calculator.html",
    output: "calculator.html",
    template: "pages/calculator",
    icon: "calculator"
  },
  {
    id: "statistics",
    label: "Statistics",
    titleKey: "pages.statistics.title",
    navKey: "nav.statistics",
    route: "/statistics.html",
    output: "statistics.html",
    template: "pages/statistics",
    icon: "chart"
  },
  {
    id: "converter",
    label: "Currency Converter",
    titleKey: "pages.converter.title",
    navKey: "nav.converter",
    route: "/converter.html",
    output: "converter.html",
    template: "pages/converter",
    icon: "exchange"
  },
  {
    id: "settings",
    label: "Settings",
    titleKey: "pages.settings.title",
    navKey: "nav.settings",
    route: "/settings.html",
    output: "settings.html",
    template: "pages/settings",
    icon: "settings"
  }
];

module.exports = pages;
