import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error -- scripts/*.mjs are untyped Node helpers
import { assertCertificationTarget } from "../../scripts/lib/certification-env-guard.mjs";

const keys = [
  "PGS_PREVIEW_FIXTURES",
  "NEXT_PUBLIC_SUPABASE_URL",
  "PGS_PREVIEW_PROJECT_REF",
  "PGS_PRODUCTION_PROJECT_REF",
];

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("certification environment guard", () => {
  it("refuses execution without the explicit Preview flag", () => {
    process.env.PGS_PREVIEW_FIXTURES = "false";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(() => assertCertificationTarget()).toThrow(/I_UNDERSTAND_PREVIEW_ONLY/);
  });

  it("allows local Supabase", () => {
    process.env.PGS_PREVIEW_FIXTURES = "I_UNDERSTAND_PREVIEW_ONLY";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    delete process.env.PGS_PREVIEW_PROJECT_REF;
    expect(assertCertificationTarget()).toMatchObject({ local: true, projectRef: "127" });
  });

  it("refuses a Production project ref", () => {
    process.env.PGS_PREVIEW_FIXTURES = "I_UNDERSTAND_PREVIEW_ONLY";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prodref.supabase.co";
    process.env.PGS_PRODUCTION_PROJECT_REF = "prodref";
    process.env.PGS_PREVIEW_PROJECT_REF = "prodref";
    expect(() => assertCertificationTarget()).toThrow(/Production project ref/);
  });

  it("refuses a remote host that does not match the Preview project ref", () => {
    process.env.PGS_PREVIEW_FIXTURES = "I_UNDERSTAND_PREVIEW_ONLY";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://otherref.supabase.co";
    process.env.PGS_PREVIEW_PROJECT_REF = "previewref";
    delete process.env.PGS_PRODUCTION_PROJECT_REF;
    expect(() => assertCertificationTarget()).toThrow(/exact PGS_PREVIEW_PROJECT_REF match/);
  });
});
