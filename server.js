const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pages = require("./src/data/pages");

const app = express();
const args = process.argv.slice(2);
const staticArgIndex = args.indexOf("--static");
const portArgIndex = args.indexOf("--port");
const staticFolder = staticArgIndex >= 0 ? args[staticArgIndex + 1] : "public";
const port = Number(process.env.PORT || (portArgIndex >= 0 ? args[portArgIndex + 1] : 3000));
const staticRoot = path.join(__dirname, staticFolder);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);
app.use(express.static(staticRoot));

if (staticFolder === "docs") {
  app.use((req, res, next) => {
    if (req.path === "/" || req.path.endsWith(".html")) {
      next();
      return;
    }
    res.status(404).send("Not found");
  });
}

pages.forEach((page) => {
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
