import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const [input, outputDirectory, exportName] = process.argv.slice(2);

if (!input || !outputDirectory || !exportName) {
  throw new Error("Usage: node scripts/generate-legacy-module.mjs <html> <output-dir> <export-name>");
}

const source = await readFile(input, "utf8");
const chunkSize = 18_000;
const chunks = Array.from({ length: Math.ceil(source.length / chunkSize) }, (_, index) =>
  source.slice(index * chunkSize, (index + 1) * chunkSize)
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

await writeFile(
  join(outputDirectory, "index.ts"),
  `${imports}\n\nexport const ${exportName} = [${names}].join("");\n`,
  "utf8"
);

console.log(`${basename(input)}: ${chunks.length} generated chunks`);
