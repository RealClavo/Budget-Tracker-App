const fs = require("node:fs/promises");
const path = require("node:path");
const ejs = require("ejs");
const pages = require("../src/data/pages");

const root = path.join(__dirname, "..");
const viewsRoot = path.join(root, "src", "views");
const layoutPath = path.join(viewsRoot, "layout.ejs");
const publicRoot = path.join(root, "public");
const docsRoot = path.join(root, "docs");

async function copyDirectory(source, destination) {
  // GitHub Pages serveert alleen statische bestanden. Daarom kopieert de build
  // alles uit public naar docs voordat de EJS-pagina's worden gerenderd.
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destinationPath);
        return;
      }

      if (entry.isFile()) {
        await fs.copyFile(sourcePath, destinationPath);
      }
    })
  );
}

async function renderPage(page) {
  // Elke pagina gebruikt dezelfde EJS-layout tijdens development en build, zodat
  // Express-preview en GitHub Pages-output dezelfde navigatie/assets houden.
  const html = await ejs.renderFile(
    layoutPath,
    {
      page,
      pages,
      title: `${page.label} | CashControl`
    },
    {
      filename: layoutPath
    }
  );
  await fs.writeFile(path.join(docsRoot, page.output), html, "utf8");
}

async function build() {
  // De docs-map wordt volledig opnieuw opgebouwd. Dat voorkomt dat oude icons,
  // manifests of JavaScript-bestanden blijven staan nadat ze uit public/ zijn
  // verwijderd of hernoemd.
  await fs.rm(docsRoot, { recursive: true, force: true });
  await fs.mkdir(docsRoot, { recursive: true });
  await copyDirectory(publicRoot, docsRoot);
  await Promise.all(pages.map(renderPage));
  console.log(`Built ${pages.length} static pages in docs/`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
