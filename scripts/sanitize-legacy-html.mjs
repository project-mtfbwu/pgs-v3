import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  throw new Error("Usage: node scripts/sanitize-legacy-html.mjs <input> <output>");
}

const source = await readFile(input, "utf8");
const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);

if (!body) {
  throw new Error(`No body element found in ${basename(input)}`);
}

const sanitized = body[1]
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*')/gi, "")
  .replace(/\s+integrity=(?:"[^"]*"|'[^']*')/gi, "")
  .replace(/https?:\/\/(?:www\.)?purpleguide\.study\//gi, "/")
  .replace(/(?:\.\/)+assets\//g, "/assets/")
  .replace(/href=(['"])javascript:[\s\S]*?\1/gi, 'href="#"')
  .replace(/action=(['"])[^'"]*\1/gi, 'action="#"')
  .replace(/<input\b([^>]*?)\svalue=(['"])(?:[^'"]*)\2([^>]*)>/gi, "<input$1$3>")
  .trim();

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${sanitized}\n`, "utf8");
