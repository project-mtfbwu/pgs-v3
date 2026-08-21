"use client";

import { createElement, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { FrontendSkipLink } from "@/components/frontend-skip-link";
import { useStudentSidebarState } from "@/components/student-sidebar-state-provider";
import {
  activeLegacyLayer,
  closeLegacyLayersWithin,
  closeLegacyLayer,
  handleLegacyLayerKeydown,
  openLegacyLayer,
  prepareLegacyLayer,
  replaceLegacyLayer,
  setLegacyElementOpen
} from "@/lib/legacy-accessibility";
import { structureLegacyPageHtml } from "@/lib/legacy-frontend-structure";
import { signOutAndNavigate } from "@/lib/logout-navigation";

type Props = { html: string; page: string; studentState?: "anonymous" | "authenticated_standard" | "authenticated_premium" };

function uniqueElement(root:HTMLElement,selector:string):HTMLElement|null{
  const matches=root.querySelectorAll<HTMLElement>(selector);
  return matches.length===1?matches[0]:null;
}

function setSidebarPresentation(root: HTMLElement, open: boolean) {
  const sidebar = uniqueElement(root,"#sidebar");
  const toggle = uniqueElement(root,"#toggleBtn");
  if(!sidebar||!toggle)return;
  const icon = toggle?.querySelector("i");
  const close = uniqueElement(root, "#close_Btn");
  sidebar.classList.toggle("active", open);
  sidebar.inert = !open;
  toggle.classList.remove("hidenone");
  toggle.setAttribute("role","button");
  toggle.setAttribute("tabindex","0");
  toggle.setAttribute("aria-controls","sidebar");
  toggle.setAttribute("aria-expanded",String(open));
  toggle.setAttribute("aria-label", open ? "Close student tools" : "Open student tools");
  sidebar.setAttribute("aria-hidden",String(!open));
  close?.setAttribute("role", "button");
  close?.setAttribute("tabindex", "0");
  close?.setAttribute("aria-controls", "sidebar");
  close?.setAttribute("aria-label", "Close student tools");
  if (close instanceof HTMLImageElement) close.alt = "";
  icon?.classList.toggle("bi-arrow-right-square-fill", !open);
  icon?.classList.toggle("bi-arrow-left-square-fill", open);
}

function formPayload(form: HTMLFormElement): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};
  for (const [key, value] of new FormData(form)) {
    if (typeof value !== "string") continue;
    const existing = payload[key];
    if (existing === undefined) payload[key] = value;
    else payload[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return payload;
}

function formEndpoint(form: HTMLFormElement, page: string): string | null {
  const identity = `${form.id} ${form.className}`.toLowerCase();
  if (page === "login") return form.id === "registerForm" ? "/api/auth/register" : "/api/auth/login";
  if (page === "forgot-password") return "/api/auth/forgot-password";
  if (page === "reset-password") return "/api/auth/reset-password";
  if (page === "change-password") return "/api/auth/change-password";
  if (identity.includes("contactform") || page === "contact") return "/api/enquiries";
  if (identity.includes("study") || identity.includes("journey")) return "/api/study-journey";
  if (page === "studentresources" || identity.includes("subscribe")) return "/api/deadline-subscriptions";
  if (/modal|applicant|premium|scholar|usml|referr/.test(identity) || form.closest(".premium-modal-overlay")) return "/api/leads";
  return null;
}

function showFormStatus(form: HTMLFormElement, message: string, success: boolean) {
  let status = form.querySelector<HTMLElement>(".form-results, [data-form-status]");
  if (!status) {
    status = document.createElement("div");
    status.dataset.formStatus = "true";
    form.appendChild(status);
  }
  status.setAttribute("role", "status");
  status.textContent = message;
  status.classList.remove("d-none");
  status.style.display = "block";
  status.style.color = success ? "#126b38" : "#a51d2d";
}

async function submitLegacyForm(form: HTMLFormElement, page: string, navigate: (path: string) => void) {
  const endpoint = formEndpoint(form, page);
  if (!endpoint) {
    showFormStatus(form, "This secure account action requires Supabase Auth configuration.", false);
    return;
  }
  if (!form.reportValidity()) {
    showFormStatus(form, "Please complete the required fields.", false);
    return;
  }
  const submit = form.querySelector<HTMLButtonElement | HTMLInputElement>('[type="submit"]');
  if (submit) submit.disabled = true;
  showFormStatus(form, "Submitting…", true);
  try {
    const payload = formPayload(form);
    if (page === "login") payload.redirect = new URLSearchParams(window.location.search).get("redirect") || "/student/dashboard";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(endpoint.startsWith("/api/auth/") ? payload : { page, form: form.id || "legacy-form", fields: payload })
    });
    const result = await response.json() as { message?: string; redirect?: string | null };
    if (!response.ok) throw new Error(result.message || "Unable to submit this form.");
    showFormStatus(form, result.message || "Thank you. Your submission has been received.", true);
    const currentModal = form.closest<HTMLElement>(".premium-modal-overlay");
    if (result.redirect) {
      navigate(result.redirect);
    } else if (currentModal) {
      const confirmation = document.querySelector<HTMLElement>(`#${currentModal.id}2`)
        ?? document.querySelector<HTMLElement>(`#${currentModal.id.replace(/Modal$/, "Modal2")}`);
      replaceLegacyLayer(currentModal, confirmation);
    } else {
      form.reset();
    }
  } catch (error) {
    showFormStatus(form, error instanceof Error ? error.message : "Unable to submit this form.", false);
  } finally {
    if (submit) submit.disabled = false;
  }
}

function runLegacyFormSubmission(form: HTMLFormElement, page: string, navigate: (path: string) => void) {
  void submitLegacyForm(form, page, navigate).catch(() => {
    showFormStatus(form, "Unable to submit this form. Please try again.", false);
  });
}

function moveJourneyStep(button: HTMLButtonElement, direction: 1 | -1): boolean {
  const form = button.closest("form");
  if (!form) return false;
  const steps = Array.from(form.querySelectorAll<HTMLElement>(".step"));
  if (steps.length < 2) return false;
  const current = button.closest<HTMLElement>(".step") ?? steps.find((step) => !step.classList.contains("hidden"));
  if (!current) return false;
  const next = steps[steps.indexOf(current) + direction];
  if (!next) return false;
  current.classList.add("hidden");
  current.style.display = "none";
  next.classList.remove("hidden");
  next.style.removeProperty("display");
  next.querySelector<HTMLElement>("input, select, textarea")?.focus();
  return true;
}

async function submitModalPanel(modal: HTMLElement, page: string, button: HTMLButtonElement) {
  const fields: Record<string, string> = {};
  modal.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach((input, index) => {
    if (input instanceof HTMLInputElement && ["button", "submit"].includes(input.type)) return;
    const key = input.name || input.getAttribute("autocomplete") || input.id || `field_${index + 1}`;
    if (input.value.trim()) fields[key] = input.value.trim();
  });
  button.disabled = true;
  let status = modal.querySelector<HTMLElement>("[data-form-status]");
  if (!status) {
    status = document.createElement("div");
    status.dataset.formStatus = "true";
    status.setAttribute("role", "status");
    button.parentElement?.appendChild(status);
  }
  status.textContent = "Submitting…";
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page, form: modal.id, fields })
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) throw new Error(result.message || "Unable to submit this form.");
    status.textContent = result.message || "Thank you. Your submission has been received.";
    const confirmation = document.querySelector<HTMLElement>(`#${modal.id.replace(/Modal$/, "Modal2")}`);
    replaceLegacyLayer(modal, confirmation);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Unable to submit this form.";
    status.style.color = "#a51d2d";
  } finally {
    button.disabled = false;
  }
}

async function saveCatalogItem(target: HTMLElement) {
  const owner = target.closest<HTMLElement>("[data-program-id], [data-course-id], [data-save-id]") ?? target;
  const programId = owner.dataset.programId ?? (target.classList.contains("save-program") ? target.dataset.saveId : undefined);
  const courseId = owner.dataset.courseId ?? (target.classList.contains("save-course") ? target.dataset.saveId : undefined);
  const id = Number(programId ?? courseId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const kind = programId ? "programs" : "courses";
  const saved=target.classList.contains("is-saved")||owner.classList.contains("is-saved");
  const response = await fetch(`/api/student/saved/${kind}/${id}`, { method: saved?"DELETE":"POST" });
  if (response.ok) {
    target.classList.toggle("is-saved",!saved);
    owner.classList.toggle("is-saved",!saved);
    target.setAttribute("aria-label", saved?"Save":"Remove from saved");
    if(target.matches("button"))target.textContent=saved?"♡":"♥";
  }
}

async function manageLegacyNotification(target: HTMLElement) {
  const open = target.closest<HTMLElement>("[data-notification-open]");
  const remove = target.closest<HTMLElement>("[data-notification-delete]");
  const clear = target.closest<HTMLElement>("[data-notification-clear]");
  if (open) {
    const destination = open.dataset.notificationDestination;
    if (open.dataset.notificationReadonly !== "true") {
      const response = await fetch(`/api/student/notifications/${open.dataset.notificationOpen}`, { method: "PATCH" });
      if (!response.ok) return;
      open.closest("article")?.classList.replace("is-unread", "is-read");
    }
    if (destination) window.location.assign(destination);
    return;
  }
  if (remove) {
    const response = await fetch(`/api/student/notifications/${remove.dataset.notificationDelete}`, { method: "DELETE" });
    if (response.ok) remove.closest("article")?.remove();
    return;
  }
  if (clear) {
    const response = await fetch("/api/student/notifications", { method: "DELETE" });
    if (response.ok) clear.closest(".site-notification-menu")?.querySelectorAll(".site-notification-items article").forEach((item) => item.remove());
  }
}

function disclosurePanel(root: HTMLElement, trigger: HTMLElement): HTMLElement | null {
  const panelId = trigger.getAttribute("aria-controls");
  if (!panelId) return null;
  const panel = document.getElementById(panelId);
  return panel instanceof HTMLElement && root.contains(panel) ? panel : null;
}

function setDisclosurePresentation(trigger: HTMLElement, panel: HTMLElement, open: boolean): void {
  trigger.setAttribute("aria-expanded", String(open));
  panel.setAttribute("aria-hidden", String(!open));
  panel.classList.toggle("open", open);
  panel.classList.toggle("active", open);
  if (panel.dataset.pgsInlineDisclosure === "true") {
    panel.style.display = open ? "block" : "none";
  }
}

function closeLegacyDisclosures(root: HTMLElement, except?: HTMLElement, restoreFocus = false): void {
  root.querySelectorAll<HTMLElement>("[data-pgs-disclosure-trigger='true']").forEach((trigger) => {
    if (trigger === except || trigger.getAttribute("aria-expanded") !== "true") return;
    const panel = disclosurePanel(root, trigger);
    if (panel) setDisclosurePresentation(trigger, panel, false);
    if (restoreFocus) trigger.focus();
  });
}

function registerDisclosure(
  trigger: HTMLElement | null,
  panel: HTMLElement | null,
  fallbackId: string,
  label: string,
  inlineDisplay: boolean
): void {
  if (!trigger || !panel) return;
  trigger.id ||= `${fallbackId}-trigger`;
  panel.id ||= `${fallbackId}-panel`;
  trigger.dataset.pgsDisclosureTrigger = "true";
  panel.dataset.pgsDisclosurePanel = "true";
  panel.dataset.pgsInlineDisclosure = String(inlineDisplay);
  trigger.setAttribute("aria-controls", panel.id);
  trigger.setAttribute("aria-expanded", String(panel.classList.contains("open") || panel.style.display === "block"));
  if (trigger instanceof HTMLAnchorElement && trigger.getAttribute("href") === "#") {
    trigger.setAttribute("role", "button");
  }
  if (panel.classList.contains("site-notification-menu")) {
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", label);
  }
  setDisclosurePresentation(trigger, panel, trigger.getAttribute("aria-expanded") === "true");
}

function prepareLegacyDisclosures(root: HTMLElement, page: string): void {
  root.querySelectorAll<HTMLElement>(".site-notification-dropdown").forEach((host, index) => {
    registerDisclosure(
      host.querySelector<HTMLElement>(".header-notification-wrapper, .mobile-notification-wrapper"),
      host.querySelector<HTMLElement>(".site-notification-menu"),
      `pgs-${page}-notifications-${index + 1}`,
      "Notifications",
      false
    );
  });

  const navigationTriggers = Array.from(root.querySelectorAll<HTMLAnchorElement>("a"))
    .filter((link) => /#purplePremium|#exploreCountries/i.test(link.textContent ?? ""));
  navigationTriggers.forEach((trigger, index) => {
    const premium = /#purplePremium/i.test(trigger.textContent ?? "");
    const panel = trigger.parentElement?.querySelector<HTMLElement>(
      premium ? ".dropdown-menu, #mobilePpDropdown" : ".explore-dropdown-menu, #mobileExploreDropdown"
    ) ?? null;
    registerDisclosure(
      trigger,
      panel,
      `pgs-${page}-${premium ? "premium" : "countries"}-${index + 1}`,
      premium ? "Purple Premium options" : "Explore countries options",
      true
    );
  });
}

function prepareLegacyShell(root: HTMLElement, page: string): void {
  root.querySelectorAll<HTMLElement>("header nav").forEach((navigation) => {
    if (!navigation.hasAttribute("aria-label")) navigation.setAttribute("aria-label", "Primary navigation");
  });

  root.querySelectorAll<HTMLAnchorElement>('header a[href="/"], #drawer a[href="/"]').forEach((homeLink) => {
    if (!homeLink.hasAttribute("aria-label")) homeLink.setAttribute("aria-label", "PurpleGuide home");
    homeLink.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      if (!image.hasAttribute("alt")) image.alt = "";
    });
  });

  const socialNames = new Map([
    ["instagram.png", "Instagram"],
    ["facebook.png", "Facebook"],
    ["threads.png", "Threads"],
    ["youtube.png", "YouTube"],
    ["linkdln.png", "LinkedIn"]
  ]);
  root.querySelectorAll<HTMLAnchorElement>(".footer-bg .social-img a").forEach((socialLink) => {
    const image = socialLink.querySelector<HTMLImageElement>("img");
    const assetName = image?.getAttribute("src")?.split("/").pop()?.toLowerCase();
    const accessibleName = assetName ? socialNames.get(assetName) : undefined;
    if (accessibleName && !socialLink.hasAttribute("aria-label")) {
      socialLink.setAttribute("aria-label", accessibleName);
    }
    if (image && !image.hasAttribute("alt")) image.alt = "";
  });
  root.querySelectorAll<HTMLImageElement>(
    '.footer-bg .social-flex > img, .footer-bg img[src$="/mail.png"]'
  ).forEach((image) => {
    if (!image.hasAttribute("alt")) image.alt = "";
  });

  const drawer = uniqueElement(root, "#drawer");
  const drawerTrigger = root.querySelector<HTMLElement>('button.btn-toggle-mobile:has(img[src*="toggle-lines"])');
  const drawerClose = drawer?.querySelector<HTMLElement>(".btn-toggle-mobile") ?? null;
  if (drawer) {
    prepareLegacyLayer(drawer, "Mobile navigation");
    drawerClose?.setAttribute("aria-label", "Close mobile navigation");
    drawerClose?.setAttribute("aria-controls", "drawer");
  }
  if (drawerTrigger) {
    drawerTrigger.id ||= `pgs-${page}-mobile-navigation-trigger`;
    drawerTrigger.setAttribute("aria-label", "Open mobile navigation");
    drawerTrigger.setAttribute("aria-controls", "drawer");
    drawerTrigger.setAttribute("aria-expanded", String(drawer?.classList.contains("active") ?? false));
    drawerTrigger.setAttribute("aria-haspopup", "dialog");
  }
  const overlay = uniqueElement(root, "#overlay");
  overlay?.setAttribute("aria-hidden", "true");

  root.querySelectorAll<HTMLElement>(".premium-modal-overlay, .pgs-login-popup-overlay").forEach((layer) => {
    prepareLegacyLayer(layer, "Dialog");
  });

  const scholarshipOpener = page === "scholarship"
    ? root.querySelector<HTMLElement>(".graidant-border.cursor-pointer")
    : null;
  if (scholarshipOpener) {
    scholarshipOpener.setAttribute("role", "button");
    scholarshipOpener.setAttribute("tabindex", "0");
    scholarshipOpener.setAttribute("aria-controls", "SCHOapplicantPremiumModal");
    scholarshipOpener.setAttribute("aria-expanded", "false");
    scholarshipOpener.setAttribute("aria-haspopup", "dialog");
  }

  const videoOverlay = root.querySelector<HTMLElement>("#premiumVideoOverlay");
  if (videoOverlay) {
    videoOverlay.setAttribute("role", "button");
    videoOverlay.setAttribute("tabindex", "0");
    videoOverlay.setAttribute("aria-label", "Play Purple Premium video");
    videoOverlay.setAttribute("aria-controls", "premiumHeroVideo");
  }

  prepareLegacyDisclosures(root, page);
}

export function LegacyPage({ html, page, studentState="anonymous" }: Props) {
  const router = useRouter();
  const { open: sidebarOpen } = useStudentSidebarState();
  const rootRef = useRef<HTMLElement>(null);
  const structuredHtml = useMemo(() => structureLegacyPageHtml(html, page), [html, page]);

  useEffect(() => {
    const root = rootRef.current;
    if (root) setSidebarPresentation(root, sidebarOpen);
  }, [page, sidebarOpen, structuredHtml]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const abort = new AbortController();
    const options = { signal: abort.signal };
    root.dataset.interactionsReady = "true";
    prepareLegacyShell(root, page);
    document.dispatchEvent(new Event("pgs:frontend-ready"));

    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const activeLayer = activeLegacyLayer(root);
        const openDisclosure = root.querySelector<HTMLElement>(
          "[data-pgs-disclosure-trigger='true'][aria-expanded='true']"
        );
        const disclosureBelongsToActiveDrawer = activeLayer?.id === "drawer"
          && openDisclosure !== null
          && activeLayer.contains(openDisclosure);
        if (openDisclosure && (!activeLayer || disclosureBelongsToActiveDrawer)) {
          event.preventDefault();
          closeLegacyDisclosures(root, undefined, true);
          return;
        }
      }
      if (handleLegacyLayerKeydown(root, event)) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (event.key === "Escape") {
        const sidebar = uniqueElement(root, "#sidebar");
        if (sidebar?.classList.contains("active")) {
          event.preventDefault();
          uniqueElement(root, "#close_Btn")?.click();
        }
        return;
      }

      if (!["Enter", " "].includes(event.key)) return;
      if (target.matches(
        "#toggleBtn, #close_Btn, .graidant-border.cursor-pointer, #premiumVideoOverlay, [data-pgs-disclosure-trigger='true']"
      )) {
        event.preventDefault();
        target.click();
      }
    }, options);

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !root.contains(target)) {
        closeLegacyDisclosures(root);
      }
    }, options);

    root.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
      form.dataset.v3SubmitReady = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        runLegacyFormSubmission(form, page, (path) => router.push(path));
      }, options);
      form.querySelectorAll<HTMLElement>('[type="submit"]').forEach((control) => {
        control.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          runLegacyFormSubmission(form, page, (path) => router.push(path));
        }, { ...options, capture: true });
      });
    });
    root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>("a");
      const button = target.closest<HTMLButtonElement>("button");

      if (!target.closest("[data-pgs-disclosure-trigger='true'], [data-pgs-disclosure-panel='true']")) {
        closeLegacyDisclosures(root);
      }

      if (target.closest("[data-notification-open], [data-notification-delete], [data-notification-clear]")) {
        event.preventDefault();
        event.stopPropagation();
        void manageLegacyNotification(target);
        return;
      }

      if ((link?.href.includes("Googlelogins/googleLogin") || button?.classList.contains("btn-google")) && page === "login") {
        event.preventDefault();
        const next = new URLSearchParams(window.location.search).get("redirect") || "/student/dashboard";
        router.push(`/auth/google?next=${encodeURIComponent(next)}`);
        return;
      }

      if (button?.classList.contains("btn-back") && moveJourneyStep(button, -1)) {
        event.preventDefault();
        return;
      }

      if (button?.classList.contains("btn-next")) {
        const form = button.closest<HTMLFormElement>("form");
        if (button.id === "studyJourneySubmitBtn" && form) {
          event.preventDefault();
          runLegacyFormSubmission(form, page, (path) => router.push(path));
          return;
        }
        if (moveJourneyStep(button, 1)) {
          event.preventDefault();
          return;
        }
      }

      if (button?.querySelector('img[src*="toggle-lines"]')) {
        event.preventDefault();
        const drawer = uniqueElement(root, "#drawer");
        setLegacyElementOpen(uniqueElement(root, "#overlay"), true);
        openLegacyLayer(drawer, button);
        return;
      }

      if (target.closest("#drawer .btn-toggle-mobile") || target.closest("#overlay")) {
        closeLegacyLayer(uniqueElement(root, "#drawer"));
        return;
      }

      const notification = target.closest(".header-notification-wrapper, .mobile-notification-wrapper");
      if (notification) {
        event.preventDefault();
        const trigger = notification as HTMLElement;
        const menu = disclosurePanel(root, trigger);
        if (menu) {
          const open = trigger.getAttribute("aria-expanded") !== "true";
          closeLegacyDisclosures(root, trigger);
          setDisclosurePresentation(trigger, menu, open);
        }
        return;
      }

      if (link?.textContent?.includes("#purplePremium")) {
        const dropdown = disclosurePanel(root, link);
        if (dropdown) {
          event.preventDefault();
          const open = link.getAttribute("aria-expanded") !== "true";
          closeLegacyDisclosures(root, link);
          setDisclosurePresentation(link, dropdown, open);
          return;
        }
      }

      if (link?.textContent?.includes("#exploreCountries")) {
        const dropdown = disclosurePanel(root, link);
        if (dropdown) {
          event.preventDefault();
          const open = link.getAttribute("aria-expanded") !== "true";
          closeLegacyDisclosures(root, link);
          setDisclosurePresentation(link, dropdown, open);
          return;
        }
      }

      const filter = link?.dataset.filter;
      if (filter?.startsWith(".")) {
        event.preventDefault();
        root.querySelectorAll<HTMLElement>(".grid-item").forEach((item) => {
          item.style.display = item.matches(filter) ? "block" : "none";
        });
        root.querySelectorAll(".portfolio-filter .nav").forEach((item) => item.classList.remove("active"));
        link?.closest(".nav")?.classList.add("active");
        return;
      }

      const controlledTarget = button?.dataset.bsTarget || link?.dataset.bsTarget || link?.getAttribute("data-target");
      if (controlledTarget?.startsWith("#")) {
        const controlled = document.querySelector<HTMLElement>(controlledTarget);
        if (controlled) {
          if (controlled.classList.contains("collapse")) {
            event.preventDefault();
            const open = !controlled.classList.contains("show");
            controlled.classList.toggle("show", open);
            controlled.style.display = open ? "block" : "none";
            controlled.setAttribute("aria-hidden", String(!open));
            (button ?? link)?.setAttribute("aria-expanded", String(open));
            if (controlled.id) (button ?? link)?.setAttribute("aria-controls", controlled.id);
            return;
          }
          if (controlled.matches(".premium-modal-overlay, .pgs-login-popup-overlay, .pgs-modal, [role='dialog']")) {
            event.preventDefault();
            openLegacyLayer(controlled, button ?? link);
            return;
          }
        }
      }

      if (page === "scholarship" && target.closest(".graidant-border.cursor-pointer")) {
        event.preventDefault();
        openLegacyLayer(
          root.querySelector<HTMLElement>("#SCHOapplicantPremiumModal"),
          target.closest<HTMLElement>(".graidant-border.cursor-pointer")
        );
        return;
      }

      if (target.closest(".btn-join")) {
        const modal = root.querySelector<HTMLElement>("#joinPremiumModal");
        if (modal) {
          event.preventDefault();
          openLegacyLayer(modal, target.closest<HTMLElement>(".btn-join"));
        }
        return;
      }

      if (target.closest('[data-text="Request it here"]')) {
        const modal = root.querySelector<HTMLElement>("#applicantPremiumModal");
        if (modal) {
          event.preventDefault();
          openLegacyLayer(modal, target.closest<HTMLElement>('[data-text="Request it here"]'));
        }
        return;
      }

      if (target.closest("[href='#contact']")) {
        event.preventDefault();
        router.push("/contact");
        return;
      }

      if (target.closest(".premium-unlock-link, [data-premium-purchase]")) {
        event.preventDefault();
        return;
      }

      const saveControl = target.closest<HTMLElement>(".save-program, .save-course, .heart-icon, [data-save-id]");
      if (saveControl) {
        event.preventDefault();
        if (saveControl && root.querySelector(".pgs-auth-account")) void saveCatalogItem(saveControl);
        else openLegacyLayer(
          root.querySelector<HTMLElement>("#pgsLoginPopup"),
          saveControl?.closest<HTMLElement>("button, a, [role='button'], [tabindex]")
            ?? saveControl
        );
        return;
      }

      if (target.closest("#premiumVideoOverlay, .premium-video-play, [data-premium-video], [href='#premiumVideoOverlay']")) {
        event.preventDefault();
        const overlay = root.querySelector<HTMLElement>("#premiumVideoOverlay");
        const video = root.querySelector<HTMLVideoElement>("#premiumHeroVideo");
        if (overlay && video) {
          overlay.dataset.pgsVideoPlaying = "true";
          overlay.style.display = "none";
          overlay.setAttribute("aria-hidden", "true");
          video.focus();
          void video.play().catch(() => {
            delete overlay.dataset.pgsVideoPlaying;
            overlay.style.removeProperty("display");
            overlay.setAttribute("aria-hidden", "false");
            overlay.focus();
          });
        }
        return;
      }

      const modalCta = target.closest<HTMLButtonElement>(".premium-modal-overlay .cta-btn");
      const modal = modalCta?.closest<HTMLElement>(".premium-modal-overlay");
      if (modalCta && modal) {
        event.preventDefault();
        void submitModalPanel(modal, page, modalCta);
        return;
      }

      const closingLayer = target.closest<HTMLElement>(".premium-modal-overlay, .pgs-login-popup-overlay");
      if (
        target.closest(".premium-modal-close, .pgs-modal-close, .pgs-login-popup-close, .close-btn, [data-dismiss='modal']")
        || (closingLayer && target === closingLayer)
      ) {
        closeLegacyLayer(closingLayer);
        return;
      }

      const rawHref = link?.getAttribute("href");
      if (link && rawHref?.toLowerCase() === "/logout") {
        event.preventDefault();
        void signOutAndNavigate().catch(() => router.push("/logout"));
        return;
      }
      if (link && rawHref?.startsWith("/") && !rawHref.startsWith("//") && !link.hasAttribute("download") && link.target !== "_blank" && event instanceof MouseEvent && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        router.push(rawHref);
      }
    }, options);

    return () => {
      abort.abort();
      closeLegacyLayersWithin(root);
      delete root.dataset.interactionsReady;
    };
  }, [page, router, structuredHtml]);

  return (
    <>
      <FrontendSkipLink />
      {createElement("pgs-legacy-page", {
        ref: rootRef,
        "data-legacy-page": page,
        "data-student-state": studentState,
        dangerouslySetInnerHTML: { __html: structuredHtml }
      })}
    </>
  );
}
