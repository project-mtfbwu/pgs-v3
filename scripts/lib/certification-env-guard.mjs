const CERTIFICATION_FLAG = "I_UNDERSTAND_PREVIEW_ONLY";
export const CERTIFICATION_MARKER = "pgs_certification_fixture";
export const CERTIFICATION_NAMESPACE = "pgs-v3-cert";
export const CERTIFICATION_EMAIL_DOMAIN = "example.test";
export const CERTIFICATION_EMAIL_PREFIX = "pgs-v3-fixture+";

function hostnameOf(urlValue) {
  try {
    return new URL(urlValue).hostname;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
}

export function isLocalSupabaseHost(host) {
  return /^(127\.0\.0\.1|localhost)$/.test(host);
}

export function projectRefFromHost(host) {
  return host.split(".")[0] ?? host;
}

export function emailForFixture(name) {
  return `${CERTIFICATION_EMAIL_PREFIX}${name}@${CERTIFICATION_EMAIL_DOMAIN}`;
}

export function certificationUserMetadata(name, context) {
  return {
    full_name: `Fixture ${name}`,
    pgs_context: context,
    [CERTIFICATION_MARKER]: true,
    pgs_certification_namespace: CERTIFICATION_NAMESPACE,
  };
}

export function isCertificationFixtureUser(user) {
  const metadata = user?.user_metadata ?? user?.raw_user_meta_data ?? {};
  return metadata[CERTIFICATION_MARKER] === true
    && metadata.pgs_certification_namespace === CERTIFICATION_NAMESPACE;
}

/**
 * Hard local/Preview guard. Never infers environment from variable names alone.
 * Refuses Production when PGS_PRODUCTION_PROJECT_REF matches the URL project ref.
 */
export function assertCertificationTarget({ requirePreviewFlag = true } = {}) {
  if (requirePreviewFlag && process.env.PGS_PREVIEW_FIXTURES !== CERTIFICATION_FLAG) {
    throw new Error("Set PGS_PREVIEW_FIXTURES=I_UNDERSTAND_PREVIEW_ONLY.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  const host = hostnameOf(url);
  const local = isLocalSupabaseHost(host);
  const projectRef = projectRefFromHost(host);
  const productionRef = process.env.PGS_PRODUCTION_PROJECT_REF?.trim();
  const previewRef = process.env.PGS_PREVIEW_PROJECT_REF?.trim();

  if (productionRef && projectRef === productionRef) {
    throw new Error("Refusing certification fixtures against the Production project ref.");
  }

  if (!local) {
    if (!previewRef) {
      throw new Error("Non-local certification requires PGS_PREVIEW_PROJECT_REF.");
    }
    if (previewRef !== projectRef) {
      throw new Error("Refusing non-local fixture work without an exact PGS_PREVIEW_PROJECT_REF match.");
    }
  }

  return { url, host, local, projectRef };
}
