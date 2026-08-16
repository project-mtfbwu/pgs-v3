import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error("Usage: node scripts/generate-home-root-states.mjs <path-to-application/views/home.php>");
}

const expectedSourceSha256 = "1708b611e040bbc127e5f275607ca90d096b843e6abdaae546849be14c2acca0";
const repositoryRoot = process.cwd();
const generatedRoot = resolve(repositoryRoot, "src/legacy/generated");
const chunkSize = 18_000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function extractBalancedElement(source, tag, marker, occurrence = 0) {
  const markerMatches = [...source.matchAll(new RegExp(marker, "gi"))];
  const markerMatch = markerMatches[occurrence];
  if (!markerMatch || markerMatch.index === undefined) {
    throw new Error(`Unable to find ${tag} marker: ${marker}`);
  }

  const start = source.lastIndexOf(`<${tag}`, markerMatch.index);
  if (start < 0) {
    throw new Error(`Unable to find opening <${tag}> for marker: ${marker}`);
  }
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(source))) {
    depth += new RegExp(`^<${tag}\\b`, "i").test(match[0]) ? 1 : -1;
    if (depth === 0) return source.slice(start, tags.lastIndex);
  }
  throw new Error(`Unbalanced <${tag}> for marker: ${marker}`);
}

function evaluateIdentityCondition(condition, premiumStatus) {
  const compact = condition.replace(/\s+/g, " ").trim();
  if (compact === "$pp_logged_in") return true;
  if (compact === "$pp_logged_in && $pp_premium === 'approved'") return premiumStatus === "approved";
  if (compact === "$pp_logged_in && $pp_premium === 'pending'") return premiumStatus === "pending";
  throw new Error(`Unsupported home identity condition: ${compact}`);
}

function renderIdentityConditionals(source, premiumStatus) {
  const directive = /<\?php\s*(if\s*\(([\s\S]*?)\)\s*:|elseif\s*\(([\s\S]*?)\)\s*:|else\s*:|endif\s*;?)\s*\?>/gi;
  const stack = [];
  let output = "";
  let cursor = 0;
  let match;

  const isActive = () => stack.every((entry) => entry.active);
  while ((match = directive.exec(source))) {
    if (isActive()) output += source.slice(cursor, match.index);
    const command = match[1].trim().toLowerCase();
    if (command.startsWith("if")) {
      const parentActive = isActive();
      const selected = parentActive && evaluateIdentityCondition(match[2], premiumStatus);
      stack.push({ parentActive, matched: selected, active: selected });
    } else if (command.startsWith("elseif")) {
      const entry = stack.at(-1);
      if (!entry) throw new Error("Unexpected elseif in home identity block.");
      const selected = entry.parentActive && !entry.matched && evaluateIdentityCondition(match[3], premiumStatus);
      entry.active = selected;
      entry.matched ||= selected;
    } else if (command.startsWith("else")) {
      const entry = stack.at(-1);
      if (!entry) throw new Error("Unexpected else in home identity block.");
      entry.active = entry.parentActive && !entry.matched;
      entry.matched = true;
    } else {
      if (!stack.pop()) throw new Error("Unexpected endif in home identity block.");
    }
    cursor = directive.lastIndex;
  }
  if (stack.length) throw new Error("Unclosed conditional in home identity block.");
  output += source.slice(cursor);
  return output;
}

function renderPhpExpression(expression, premiumStatus) {
  if (expression.includes("user_avatar_url")) return "/assets/img/default-avatar.png";
  if (expression.includes("$pp_user->name")) return "Guest";
  if (expression.includes("$pp_user->email")) return "";
  if (expression.includes("$pp_logged_in && $pp_premium !== 'approved'")) {
    if (expression.includes("padding-left")) return premiumStatus === "approved" ? "" : "padding-left: 10px;";
    return premiumStatus === "approved" ? "" : "justify-content-start";
  }

  const baseUrl = expression.match(/base_url\(\s*(['"])(.*?)\1\s*\)/i);
  if (baseUrl) return `/${baseUrl[2].replace(/^\/+/, "")}`;
  throw new Error(`Unsupported home PHP expression: ${expression.replace(/\s+/g, " ").trim()}`);
}

function sanitizeRecoveredFragment(source, premiumStatus = "none") {
  return source
    .replace(/<\?=\s*([\s\S]*?)\s*\?>/g, (_match, expression) => renderPhpExpression(expression, premiumStatus))
    .replace(/<\?(?:php)?[\s\S]*?\?>/gi, "")
    .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/(?:\.\/)+assets\//g, "/assets/")
    .replace(/\bhref=(["'])\/Login\/logout\1/gi, 'href="/logout"')
    .trim();
}

async function readGeneratedHtml(slug) {
  const directory = resolve(generatedRoot, slug);
  const chunks = (await readdir(directory)).filter((name) => /^\d+\.ts$/.test(name)).sort();
  return (await Promise.all(chunks.map(async (name) => {
    const moduleSource = await readFile(resolve(directory, name), "utf8");
    const match = moduleSource.match(/^export default ([\s\S]*);\s*$/);
    if (!match) throw new Error(`Unexpected generated chunk format: ${slug}/${name}`);
    return JSON.parse(match[1]);
  }))).join("");
}

async function writeGeneratedHtml(slug, exportName, html) {
  const directory = resolve(generatedRoot, slug);
  const chunks = Array.from({ length: Math.ceil(html.length / chunkSize) }, (_, index) =>
    html.slice(index * chunkSize, (index + 1) * chunkSize)
  );
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await Promise.all(chunks.map((chunk, index) => {
    const suffix = String(index).padStart(2, "0");
    return writeFile(resolve(directory, `${suffix}.ts`), `export default ${JSON.stringify(chunk)};\n`, "utf8");
  }));
  const imports = chunks.map((_, index) => {
    const suffix = String(index).padStart(2, "0");
    return `import chunk${suffix} from "./${suffix}";`;
  }).join("\n");
  const names = chunks.map((_, index) => `chunk${String(index).padStart(2, "0")}`).join(", ");
  await writeFile(resolve(directory, "index.ts"), `${imports}\n\nexport const ${exportName} = [${names}].join("");\n`, "utf8");
  return { chunks: chunks.length, bytes: html.length, sha256: sha256(html) };
}

const legacySource = await readFile(resolve(sourcePath), "utf8");
const sourceSha256 = sha256(legacySource);
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`home.php SHA-256 mismatch. Expected ${expectedSourceSha256}, received ${sourceSha256}.`);
}

const anonymousHome = await readGeneratedHtml("home");
const anonymousHero = extractBalancedElement(anonymousHome, "section", "mobile-home-hero");
const identitySource = extractBalancedElement(legacySource, "section", "mobile-student-cart");
const welcomeSource = extractBalancedElement(legacySource, "section", "welcome to #PGS");
const exploreSource = extractBalancedElement(legacySource, "section", "Choose this if you're exploring your options");

const standardIdentity = sanitizeRecoveredFragment(renderIdentityConditionals(identitySource, "none"), "none");
const premiumIdentity = sanitizeRecoveredFragment(renderIdentityConditionals(identitySource, "approved"), "approved");
const standardExplore = sanitizeRecoveredFragment(exploreSource);
const premiumWelcome = sanitizeRecoveredFragment(welcomeSource);

const standardHome = anonymousHome.replace(anonymousHero, `${standardIdentity}\n${standardExplore}`);
const premiumHome = anonymousHome.replace(anonymousHero, `${premiumIdentity}\n${premiumWelcome}`);

if (standardHome === anonymousHome || premiumHome === anonymousHome) {
  throw new Error("Authenticated home generation did not replace the anonymous hero.");
}

const standardResult = await writeGeneratedHtml("home-standard", "homeStandardHtml", standardHome);
const premiumResult = await writeGeneratedHtml("home-premium", "homePremiumHtml", premiumHome);
const manifest = {
  source: {
    path: "application/views/home.php",
    git_blob_sha: "6a13b841e8591ccdff214bbb24e444ef8fb41701",
    sha256: sourceSha256
  },
  anonymous_base: {
    path: "src/legacy/generated/home",
    sha256: sha256(anonymousHome)
  },
  composition: {
    authenticated_standard: {
      figma_node: "17027:17252",
      sections: ["mobile-student-cart", "Explore #PGS"],
      fragment_sha256: [sha256(standardIdentity), sha256(standardExplore)]
    },
    authenticated_premium: {
      figma_node: "17098:12263",
      sections: ["mobile-student-cart", "welcome to #PGS"],
      fragment_sha256: [sha256(premiumIdentity), sha256(premiumWelcome)]
    }
  },
  output: {
    homeStandardHtml: standardResult,
    homePremiumHtml: premiumResult
  }
};
await writeFile(resolve(generatedRoot, "home-root-states.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Generated home-standard (${standardResult.bytes} bytes, ${standardResult.chunks} chunks)`);
console.log(`Generated home-premium (${premiumResult.bytes} bytes, ${premiumResult.chunks} chunks)`);
