const legacyLayerSelector = [
  "#drawer",
  ".premium-modal-overlay",
  ".pgs-login-popup-overlay"
].join(",");

const legacyLayerCloseSelector = [
  ".premium-modal-close",
  ".pgs-modal-close",
  ".pgs-login-popup-close",
  ".close-btn",
  "[data-dismiss='modal']",
  "#drawer .btn-toggle-mobile"
].join(",");

const legacyFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const layerOpeners = new WeakMap<HTMLElement, HTMLElement>();
const layerParents = new WeakMap<HTMLElement, HTMLElement>();
const layerOpenOrder = new WeakMap<HTMLElement, number>();
const bodyLockOwner = "pgsFrontendLayerLock";
let openSequence = 0;

function isRendered(element: HTMLElement): boolean {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function focusableElements(layer: HTMLElement): HTMLElement[] {
  return Array.from(layer.querySelectorAll<HTMLElement>(legacyFocusableSelector))
    .filter((element) => element.getAttribute("aria-hidden") !== "true" && isRendered(element));
}

function dialogElement(layer: HTMLElement): HTMLElement {
  if (layer.classList.contains("pgs-login-popup-overlay")) {
    return layer.querySelector<HTMLElement>("[role='dialog']") ?? layer;
  }
  return layer;
}

function ensureDialogName(layer: HTMLElement, fallbackLabel: string): void {
  const dialog = dialogElement(layer);
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  if (dialog.hasAttribute("aria-label") || dialog.hasAttribute("aria-labelledby")) return;

  const heading = layer.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6");
  if (heading) {
    const headingId = heading.id || `${layer.id || "pgs-dialog"}-title`;
    heading.id = headingId;
    dialog.setAttribute("aria-labelledby", headingId);
  } else {
    dialog.setAttribute("aria-label", fallbackLabel);
  }
}

function isBlockingLayerOpen(layer: HTMLElement): boolean {
  if (layer.id === "drawer") return layer.classList.contains("active");
  if (layer.classList.contains("pgs-login-popup-overlay")) return layer.classList.contains("show");
  return layer.classList.contains("open") || layer.classList.contains("active");
}

function resetNestedDisclosures(layer: HTMLElement): void {
  layer.querySelectorAll<HTMLElement>("[data-pgs-disclosure-trigger='true']").forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
    const panelId = trigger.getAttribute("aria-controls");
    const candidate = panelId ? document.getElementById(panelId) : null;
    const panel = candidate instanceof HTMLElement && layer.contains(candidate) ? candidate : null;
    if (!panel) return;
    panel.setAttribute("aria-hidden", "true");
    panel.classList.remove("open", "active");
    if (panel.dataset.pgsInlineDisclosure === "true") panel.style.display = "none";
  });
}

export function syncLegacyBodyScrollLock(): void {
  const blockingLayerOpen = Array.from(document.querySelectorAll<HTMLElement>(legacyLayerSelector))
    .some(isBlockingLayerOpen);
  const body = document.body;

  if (blockingLayerOpen) {
    if (!body.classList.contains("overflow-hidden")) {
      body.classList.add("overflow-hidden");
      body.dataset[bodyLockOwner] = "true";
    }
    return;
  }

  if (body.dataset[bodyLockOwner] === "true") {
    body.classList.remove("overflow-hidden");
    delete body.dataset[bodyLockOwner];
  }
}

export function setLegacyElementOpen(element: HTMLElement | null, open: boolean): void {
  if (!element) return;
  element.classList.toggle("open", open);
  element.classList.toggle("active", open);
  if (element.classList.contains("pgs-login-popup-overlay")) {
    element.classList.toggle("show", open);
  }
  if (element.classList.contains("pgs-modal") || element.classList.contains("premium-modal-overlay")) {
    element.style.display = open ? "flex" : "none";
  }
  element.setAttribute("aria-hidden", element.id === "overlay" ? "true" : String(!open));
  syncLegacyBodyScrollLock();
}

export function prepareLegacyLayer(layer: HTMLElement, label: string): void {
  ensureDialogName(layer, label);
  layer.setAttribute("aria-hidden", String(!isBlockingLayerOpen(layer)));
  layer.inert = !isBlockingLayerOpen(layer);
}

export function openLegacyLayer(layer: HTMLElement | null, opener?: HTMLElement | null): void {
  if (!layer) return;
  const parentLayer = activeLegacyLayer(document.body);
  if (parentLayer && parentLayer !== layer) {
    layerParents.set(layer, parentLayer);
    parentLayer.inert = true;
    parentLayer.setAttribute("aria-hidden", "true");
  }
  prepareLegacyLayer(layer, layer.id === "drawer" ? "Mobile navigation" : "Dialog");
  if (opener) {
    layerOpeners.set(layer, opener);
    opener.setAttribute("aria-expanded", "true");
    if (layer.id) opener.setAttribute("aria-controls", layer.id);
    opener.setAttribute("aria-haspopup", "dialog");
  }
  openSequence += 1;
  layerOpenOrder.set(layer, openSequence);
  layer.inert = false;
  setLegacyElementOpen(layer, true);

  window.requestAnimationFrame(() => {
    if (!isBlockingLayerOpen(layer)) return;
    const preferred = layer.querySelector<HTMLElement>(legacyLayerCloseSelector);
    const target = preferred && isRendered(preferred) ? preferred : focusableElements(layer)[0];
    if (target) target.focus();
    else {
      const dialog = dialogElement(layer);
      dialog.tabIndex = -1;
      dialog.focus();
    }
  });
}

export function closeLegacyLayer(layer: HTMLElement | null, restoreFocus = true): void {
  if (!layer) return;
  resetNestedDisclosures(layer);
  if (layer.id === "drawer") {
    const owner = layer.closest<HTMLElement>("[data-legacy-page]") ?? document.body;
    setLegacyElementOpen(owner.querySelector<HTMLElement>("#overlay"), false);
  }
  setLegacyElementOpen(layer, false);
  layer.inert = true;
  const opener = layerOpeners.get(layer);
  opener?.setAttribute("aria-expanded", "false");
  const parentLayer = layerParents.get(layer);
  if (parentLayer && isBlockingLayerOpen(parentLayer)) {
    parentLayer.inert = false;
    parentLayer.setAttribute("aria-hidden", "false");
  }
  layerParents.delete(layer);
  layerOpenOrder.delete(layer);
  layerOpeners.delete(layer);

  if (restoreFocus && opener?.isConnected) {
    window.requestAnimationFrame(() => opener.focus());
  }
}

export function closeLegacyLayersWithin(root: HTMLElement): void {
  const layers = Array.from(root.querySelectorAll<HTMLElement>(legacyLayerSelector)).reverse();
  layers.forEach((layer) => {
    if (isBlockingLayerOpen(layer)) closeLegacyLayer(layer, false);
    layerParents.delete(layer);
    layerOpenOrder.delete(layer);
    layerOpeners.delete(layer);
  });
  syncLegacyBodyScrollLock();
}

export function replaceLegacyLayer(current: HTMLElement, next: HTMLElement | null): void {
  const opener = layerOpeners.get(current);
  if (!next) {
    closeLegacyLayer(current);
    return;
  }
  closeLegacyLayer(current, false);
  openLegacyLayer(next, opener);
}

export function activeLegacyLayer(root: HTMLElement): HTMLElement | null {
  const layers = Array.from(root.querySelectorAll<HTMLElement>(legacyLayerSelector));
  let active: HTMLElement | null = null;
  let activeOrder = -1;
  for (let index = 0; index < layers.length; index += 1) {
    if (!isBlockingLayerOpen(layers[index])) continue;
    const order = layerOpenOrder.get(layers[index]) ?? 0;
    if (order >= activeOrder) {
      active = layers[index];
      activeOrder = order;
    }
  }
  return active;
}

export function handleLegacyLayerKeydown(root: HTMLElement, event: KeyboardEvent): boolean {
  const layer = activeLegacyLayer(root);
  if (!layer) return false;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeLegacyLayer(layer);
    return true;
  }

  if (event.key !== "Tab") return false;
  const focusable = focusableElements(layer);
  if (!focusable.length) {
    event.preventDefault();
    dialogElement(layer).focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !layer.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !layer.contains(active))) {
    event.preventDefault();
    first.focus();
  }
  return true;
}
