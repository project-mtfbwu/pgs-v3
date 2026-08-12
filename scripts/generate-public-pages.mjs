import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const [captureDirectory, outputRoot, hostingerRoot] = process.argv.slice(2);

if (!captureDirectory || !outputRoot || !hostingerRoot) {
  throw new Error("Usage: node scripts/generate-public-pages.mjs <capture-dir> <output-root> <hostinger-root>");
}

const pages = [
  ["about", "aboutHtml"],
  ["contact", "contactHtml"],
  ["countriesaus", "countriesAusHtml"],
  ["countriescanada", "countriesCanadaHtml"],
  ["countrieseurope", "countriesEuropeHtml"],
  ["countriesfrance", "countriesFranceHtml"],
  ["countriesgermany", "countriesGermanyHtml"],
  ["countriesmauritius", "countriesMauritiusHtml"],
  ["countriesnz", "countriesNzHtml"],
  ["countriesothers", "countriesOthersHtml"],
  ["countriesuk", "countriesUkHtml"],
  ["cvreadyprogram", "cvReadyProgramHtml"],
  ["error-404", "error404Html"],
  ["event-session", "eventSessionHtml"],
  ["explorecountries", "exploreCountriesHtml"],
  ["finance", "financeHtml"],
  ["forgot-password", "forgotPasswordHtml"],
  ["login", "loginHtml"],
  ["program-detail", "programDetailHtml"],
  ["purpleamc", "purpleAmcHtml"],
  ["purpleboard", "purpleBoardHtml"],
  ["purpleevents", "purpleEventsHtml"],
  ["purplenonmedical", "purpleNonMedicalHtml"],
  ["purpleplab", "purplePlabHtml"],
  ["purplepremiumhome", "purplePremiumHomeHtml"],
  ["purpleusme", "purpleUsmeHtml"],
  ["scholarship", "scholarshipHtml"],
  ["simplehome", "simpleHomeHtml"],
  ["signup", "signupHtml"],
  ["studentresources", "studentResourcesHtml"],
  ["unitieup", "uniTieUpHtml"],
  ["usmlerotation", "usmleRotationHtml"],
  ["reset-password", "resetPasswordHtml"],
  ["change-password", "changePasswordHtml"]
];

function replaceLegacyPhp(source) {
  return source
    .replace(/<\?=\s*base_url\(\s*(['"])(.*?)\1\s*\)\s*\?>/g, (_, _quote, path) => `/${path.replace(/^\/+/, "")}`)
    .replace(/<\?=\s*html_escape\([^?]*\)\s*\?>/g, "")
    .replace(/<\?=\s*[^?]*\?>/g, "")
    .replace(/<\?(?:php)?[\s\S]*?\?>/gi, "")
    .replace(/<option\s+value=["']\s*["']\s*>\s*<\/option>/gi, "");
}

function sanitizeDocument(source, label) {
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error(`No body element found in ${label}`);

  return body[1]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\s+integrity=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/https?:\/\/(?:www\.)?purpleguide\.study\//gi, "/")
    .replace(/(?:\.\/)+assets\//g, "/assets/")
    .replace(/href=(['"])javascript:[\s\S]*?\1/gi, 'href="#"')
    .replace(/action=(['"])[^'"]*\1/gi, 'action="#"')
    .replace(/<input\b([^>]*?)\svalue=(['"])(?:[^'"]*)\2([^>]*)>/gi, "<input$1$3>")
    .trim();
}

async function buildContactCapture() {
  const source = await readFile(join(hostingerRoot, "application/views/contact.php"), "utf8");
  const header = await readFile(join(captureDirectory, "shared-header.html"), "utf8");
  const footer = await readFile(join(captureDirectory, "shared-footer.html"), "utf8");
  const assembled = source
    .replace(/<\?php\s+(?:include\(['"]header\.php['"]\)|\$this->load->view\(['"]header['"]\));?\s*\?>/gi, header)
    .replace(/<\?php\s+(?:include\(['"]footer\.php['"]\)|\$this->load->view\(['"]footer['"]\));?\s*\?>/gi, footer);
  await writeFile(join(captureDirectory, "contact.html"), replaceLegacyPhp(assembled), "utf8");
}

async function buildSourceCapture(view, slug, replacements = []) {
  const source = await readFile(join(hostingerRoot, "application/views", view), "utf8");
  const header = await readFile(join(captureDirectory, "shared-header.html"), "utf8");
  const footer = await readFile(join(captureDirectory, "shared-footer.html"), "utf8");
  let assembled = source
    .replace(/<\?php\s+\$this->load->view\(['"]header['"]\);?\s*\?>/gi, header)
    .replace(/<\?php\s+\$this->load->view\(['"]sidebar['"]\);?\s*\?>/gi, "")
    .replace(/<\?php\s+\$this->load->view\(['"]footer['"]\);?\s*\?>/gi, footer)
    .replace(/<\?php\s+\$this->load->view\(['"]partials\/testimonials['"]\);?\s*\?>/gi, "");
  for (const [pattern, replacement] of replacements) assembled = assembled.replace(pattern, replacement);
  await writeFile(join(captureDirectory, `${slug}.html`), replaceLegacyPhp(assembled), "utf8");
}

async function generateModule(slug, exportName) {
  const sourcePath = join(captureDirectory, `${slug}.html`);
  const source = await readFile(sourcePath, "utf8");
  const sanitized = sanitizeDocument(source, basename(sourcePath));
  const outputDirectory = join(outputRoot, slug);
  const chunkSize = 18_000;
  const chunks = Array.from({ length: Math.ceil(sanitized.length / chunkSize) }, (_, index) =>
    sanitized.slice(index * chunkSize, (index + 1) * chunkSize)
  );

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(chunks.map((chunk, index) => {
    const suffix = String(index).padStart(2, "0");
    return writeFile(join(outputDirectory, `${suffix}.ts`), `export default ${JSON.stringify(chunk)};\n`, "utf8");
  }));

  const imports = chunks.map((_, index) => {
    const suffix = String(index).padStart(2, "0");
    return `import chunk${suffix} from "./${suffix}";`;
  }).join("\n");
  const names = chunks.map((_, index) => `chunk${String(index).padStart(2, "0")}`).join(", ");
  await writeFile(join(outputDirectory, "index.ts"), `${imports}\n\nexport const ${exportName} = [${names}].join("");\n`, "utf8");
  return { slug, chunks: chunks.length, bytes: sanitized.length };
}

await buildContactCapture();
await buildSourceCapture("programsfull.php", "program-detail", [
  [/\<\?=\s*nl2br\(htmlspecialchars\(\$program->title\)\)\s*\?\>/g, "Program details"],
  [/\<\?=\s*nl2br\(htmlspecialchars\(\$who_text\)\)\s*\?\>/g, "Students and professionals building practical, career-ready skills."],
  [/\<\?=\s*nl2br\(htmlspecialchars\(!empty\(\$program->short_description\)[\s\S]*?\)\)\s*\?\>/g, "Program information is published from the PurpleGuide catalog."]
]);
await buildSourceCapture("singup.php", "signup");
await buildSourceCapture("reset_password.php", "reset-password");
await buildSourceCapture("changepassword.php", "change-password");
const results = [];
for (const [slug, exportName] of pages) results.push(await generateModule(slug, exportName));
console.log(`Generated ${results.length} public page modules (${results.reduce((sum, item) => sum + item.bytes, 0)} bytes)`);
for (const item of results) console.log(`${item.slug}: ${item.chunks} chunks`);
