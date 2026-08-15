const OPERATIONS_BRANCH = "cursor/phase5-operations";

type DeploymentEnvironment = Record<string, string | undefined>;

export function isOperationsPreviewSurface(
  environment: DeploymentEnvironment = process.env
): boolean {
  return environment.VERCEL_ENV === "preview"
    && environment.VERCEL_GIT_COMMIT_REF === OPERATIONS_BRANCH;
}
