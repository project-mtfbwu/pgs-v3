import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeLegacyLayer,
  closeLegacyLayersWithin,
  handleLegacyLayerKeydown,
  openLegacyLayer,
  prepareLegacyLayer,
  setLegacyElementOpen
} from "@/lib/legacy-accessibility";

function makeRendered(element: HTMLElement): void {
  Object.defineProperty(element, "getClientRects", {
    configurable: true,
    value: () => [{ bottom: 1, height: 1, left: 0, right: 1, top: 0, width: 1 }]
  });
}

describe("retained frontend accessible layers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.className = "";
    document.body.innerHTML = "";
  });

  it("names, opens, focuses, closes, and returns focus for a retained modal", () => {
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <div id="leadModal" class="pgs-modal premium-modal-overlay" style="display:none">
        <h3>Request guidance</h3>
        <button class="close-btn">Close</button>
      </div>`;
    const opener = document.querySelector<HTMLElement>("#opener")!;
    const layer = document.querySelector<HTMLElement>("#leadModal")!;
    const close = document.querySelector<HTMLElement>(".close-btn")!;
    makeRendered(close);

    prepareLegacyLayer(layer, "Dialog");
    openLegacyLayer(layer, opener);

    expect(layer.getAttribute("role")).toBe("dialog");
    expect(layer.getAttribute("aria-modal")).toBe("true");
    expect(layer.getAttribute("aria-labelledby")).toBe("leadModal-title");
    expect(layer.getAttribute("aria-hidden")).toBe("false");
    expect(layer.classList.contains("open")).toBe(true);
    expect(layer.classList.contains("active")).toBe(true);
    expect(layer.style.display).toBe("flex");
    expect(document.body.classList.contains("overflow-hidden")).toBe(true);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(close);

    closeLegacyLayer(layer);
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.style.display).toBe("none");
    expect(document.body.classList.contains("overflow-hidden")).toBe(false);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(opener);
  });

  it("keeps an external body lock and closes a drawer plus its owned overlay on Escape", () => {
    document.body.classList.add("overflow-hidden");
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <div id="overlay"></div>
      <div id="drawer"><button class="btn-toggle-mobile">Close</button></div>`;
    const root = document.body;
    const opener = document.querySelector<HTMLElement>("#opener")!;
    const overlay = document.querySelector<HTMLElement>("#overlay")!;
    const drawer = document.querySelector<HTMLElement>("#drawer")!;
    const close = drawer.querySelector<HTMLElement>("button")!;
    makeRendered(close);

    prepareLegacyLayer(drawer, "Mobile navigation");
    setLegacyElementOpen(overlay, true);
    openLegacyLayer(drawer, opener);
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });

    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(handleLegacyLayerKeydown(root, event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(drawer.classList.contains("active")).toBe(false);
    expect(drawer.classList.contains("open")).toBe(false);
    expect(overlay.classList.contains("active")).toBe(false);
    expect(overlay.classList.contains("open")).toBe(false);
    expect(document.body.classList.contains("overflow-hidden")).toBe(true);
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the most recently opened nested layer active and restores its parent", () => {
    document.body.innerHTML = `
      <button id="drawer-opener">Open navigation</button>
      <div id="overlay"></div>
      <div id="drawer"><a id="account-opener" href="#">Saved List</a></div>
      <div id="pgsLoginPopup" class="pgs-login-popup-overlay">
        <div><button class="pgs-login-popup-close">Close</button></div>
      </div>`;
    const drawerOpener = document.querySelector<HTMLElement>("#drawer-opener")!;
    const accountOpener = document.querySelector<HTMLElement>("#account-opener")!;
    const drawer = document.querySelector<HTMLElement>("#drawer")!;
    const popup = document.querySelector<HTMLElement>("#pgsLoginPopup")!;
    const popupClose = popup.querySelector<HTMLElement>("button")!;
    makeRendered(accountOpener);
    makeRendered(popupClose);

    openLegacyLayer(drawer, drawerOpener);
    openLegacyLayer(popup, accountOpener);

    expect(drawer.inert).toBe(true);
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(document.activeElement).toBe(popupClose);

    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    expect(handleLegacyLayerKeydown(document.body, event)).toBe(true);
    expect(popup.classList.contains("show")).toBe(false);
    expect(drawer.classList.contains("active")).toBe(true);
    expect(drawer.inert).toBe(false);
    expect(drawer.getAttribute("aria-hidden")).toBe("false");
    expect(document.activeElement).toBe(accountOpener);

    closeLegacyLayersWithin(document.body);
    expect(drawer.classList.contains("active")).toBe(false);
    expect(document.body.classList.contains("overflow-hidden")).toBe(false);
  });
});
