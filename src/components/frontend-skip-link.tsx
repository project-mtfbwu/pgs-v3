export const FRONTEND_MAIN_ID = "pgs-main-content";

export function FrontendSkipLink({ targetId = FRONTEND_MAIN_ID }: { targetId?: string }) {
  return (
    <a className="pgs-skip-link" href={`#${targetId}`}>
      Skip to main content
    </a>
  );
}
