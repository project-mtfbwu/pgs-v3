import { readdir,readFile } from "node:fs/promises";
import { extname,join,relative } from "node:path";

const root=new URL("../",import.meta.url).pathname;
const skipped=new Set([".git",".next","node_modules","playwright-report","test-results",".pnpm-store"]);
const textExtensions=new Set([".ts",".tsx",".js",".mjs",".json",".md",".sql",".css",".html",".txt",".toml",".yml",".yaml",".tsv",""]);
const findings=[];
const patterns=[
  ["private key",/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["live Stripe key",/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/],
  ["GitHub token",/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ["AWS access key",/\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key",/\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["JWT-shaped credential",/\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/]
];

async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(skipped.has(entry.name))continue;const path=join(directory,entry.name);if(entry.isDirectory()){await walk(path);continue;}if(!textExtensions.has(extname(entry.name)))continue;let source;try{source=await readFile(path,"utf8");}catch{continue;}for(const [label,pattern] of patterns){if(pattern.test(source))findings.push(`${relative(root,path)}: ${label}`);}}}
await walk(root);
if(findings.length){console.error(`Potential committed secrets found:\n${findings.join("\n")}`);process.exit(1);}
console.log("High-confidence secret scan passed");
