const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pages = require("./src/data/pages");

const app = express();
const args = process.argv.slice(2);
const staticArgIndex = args.indexOf("--static");
const portArgIndex = args.indexOf("--port");
// Dezelfde server kan twee rollen spelen: EJS development vanuit public, of een
// static preview van docs voor GitHub Pages controle.
const staticFolder = staticArgIndex >= 0 ? args[staticArgIndex + 1] : "public";
const port = Number(process.env.PORT || (portArgIndex >= 0 ? args[portArgIndex + 1] : 3000));
const staticRoot = path.join(__dirname, staticFolder);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(
  helmet({
    // De app gebruikt alleen lokale scripts, maar CSP staat uit in development
    // zodat browser/devtools en schooltests niet onnodig worden geblokkeerd.
    contentSecurityPolicy: false
  })
);
// Static assets staan bewust voor de rate limiter. DevTools vraagt manifest,
// screenshots en iconen vaak opnieuw op; die requests mogen nooit 429 worden.
app.use(express.static(staticRoot));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

if (staticFolder === "docs") {
  // In static preview-modus willen we geen EJS fallback voor ontbrekende assets.
  // Een missend bestand moet dan duidelijk 404 teruggeven, net als GitHub Pages.
  app.use((req, res, next) => {
    if (req.path === "/" || req.path.endsWith(".html")) {
      next();
      return;
    }
    res.status(404).send("Not found");
  });
}

pages.forEach((page) => {
  // Tijdens development renderen alle pagina's via dezelfde layout en metadata
  // uit src/data/pages.js. De build gebruikt exact dezelfde data.
  app.get(page.route, (req, res) => {
    res.render("layout", {
      page,
      pages,
      title: `${page.label} | CashControl`
    });
  });
});

app.get("/", (req, res) => {
  res.render("layout", {
    page: pages[0],
    pages,
    title: "CashControl"
  });
});

app.use((req, res) => {
  res.status(404).render("layout", {
    page: pages[0],
    pages,
    title: "CashControl"
  });
});

app.listen(port, () => {
  console.log(`CashControl running at http://localhost:${port}`);
});
