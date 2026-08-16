import {
  REGISTRY_SAVED_VIEW_MAX,
  REGISTRY_SAVED_VIEW_NAME_MAX,
  isRegistryPremiumUnassignedView,
  registryHref,
  registryPremiumUnassignedQuery,
  registryQueriesEqual,
  registrySavedQueryFromNormalized,
  type NormalizedRegistryQuery,
  type RegistrySavedView
} from "@/lib/operations-student-registry";

function HiddenQuery({ query }: { query: NormalizedRegistryQuery }) {
  const saved = registrySavedQueryFromNormalized(query);
  return (
    <>
      {Object.entries(saved).map(([key, value]) => (
        <input key={key} name={key} type="hidden" value={value} />
      ))}
    </>
  );
}

export function OperationsRegistrySavedViews({
  query,
  views,
  allowOrgFilters = false
}: {
  query: NormalizedRegistryQuery;
  views: RegistrySavedView[];
  allowOrgFilters?: boolean;
}) {
  const atLimit = views.length >= REGISTRY_SAVED_VIEW_MAX;
  const active = query.view ? views.find((view) => view.id === query.view) : views.find((view) => registryQueriesEqual({ ...query, page: 1, view: null }, { ...view.query, page: 1, view: null }));
  const allHref = "/ops/students";
  const premiumHref = registryHref({ ...query, q: null, plan: "premium", mentor: null, studyLevel: null, completion: null, joined: null, sort: null, page: 1, view: null });
  const premiumUnassignedHref = registryHref(registryPremiumUnassignedQuery());
  const premiumOnly = query.plan === "premium" && !query.q && !query.mentor && !query.studyLevel && !query.completion && !query.joined && !query.sort && !query.view;

  return (
    <div className="ops-registry-views">
      <nav aria-label="Registry views" className="ops-registry-view-tabs">
        <a aria-current={!query.q && !query.plan && !query.mentor && !query.studyLevel && !query.completion && !query.joined && !query.sort && !query.view ? "page" : undefined} href={allHref}>
          All Students
        </a>
        <a aria-current={premiumOnly ? "page" : undefined} href={premiumHref}>
          Premium
        </a>
        {allowOrgFilters ? (
          <a aria-current={isRegistryPremiumUnassignedView(query) && !query.view ? "page" : undefined} href={premiumUnassignedHref}>
            Premium Unassigned
          </a>
        ) : null}
        {views.map((view) => (
          <a
            aria-current={active?.id === view.id ? "page" : undefined}
            href={registryHref({ ...view.query, page: 1, view: view.id }, { includeView: true })}
            key={view.id}
          >
            {view.name}
          </a>
        ))}
      </nav>

      <div className="ops-registry-view-actions">
        {atLimit ? (
          <p className="ops-registry-view-limit">You can save up to 20 private views.</p>
        ) : (
          <form action="/api/admin/registry-views" className="ops-registry-save-form" method="post">
            <input name="intent" type="hidden" value="create" />
            <HiddenQuery query={query} />
            <label className="ops-registry-field" htmlFor="registry-save-view-name">
              <span>Save view</span>
              <input
                autoComplete="off"
                id="registry-save-view-name"
                maxLength={REGISTRY_SAVED_VIEW_NAME_MAX}
                name="name"
                required
                type="text"
              />
            </label>
            <button className="ops-registry-save-button" type="submit">Save view</button>
          </form>
        )}

        {active ? (
          <div className="ops-registry-view-manage">
            <form action="/api/admin/registry-views" className="ops-registry-save-form" method="post">
              <input name="intent" type="hidden" value="rename" />
              <input name="id" type="hidden" value={active.id} />
              <HiddenQuery query={query} />
              <label className="ops-registry-field" htmlFor="registry-rename-view-name">
                <span>Rename view</span>
                <input
                  autoComplete="off"
                  defaultValue={active.name}
                  id="registry-rename-view-name"
                  maxLength={REGISTRY_SAVED_VIEW_NAME_MAX}
                  name="name"
                  required
                  type="text"
                />
              </label>
              <button className="ops-registry-save-button" type="submit">Rename</button>
            </form>
            <form action="/api/admin/registry-views" method="post">
              <input name="intent" type="hidden" value="delete" />
              <input name="id" type="hidden" value={active.id} />
              <button className="ops-registry-delete-button" type="submit">Delete {active.name}</button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
