"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudentSidebarState } from "@/components/student-sidebar-state-provider";
import { signOutAndNavigate } from "@/lib/logout-navigation";

type Props = { html: string; page: string; studentState?: "anonymous" | "authenticated_standard" | "authenticated_premium" };

function setOpen(element: HTMLElement | null, open: boolean) {
  if (!element) return;
  element.classList.toggle("open", open);
  element.classList.toggle("active", open);
  if (element.classList.contains("pgs-modal") || element.classList.contains("premium-modal-overlay")) {
    element.style.display = open ? "flex" : "none";
  }
  if (element.classList.contains("drawer") || element.classList.contains("overlay") || element.classList.contains("premium-modal-overlay")) {
    document.body.classList.toggle("overflow-hidden", open);
  }
}

function uniqueElement(root:HTMLElement,selector:string):HTMLElement|null{
  const matches=root.querySelectorAll<HTMLElement>(selector);
  return matches.length===1?matches[0]:null;
}

function setSidebarPresentation(root: HTMLElement, open: boolean) {
  const sidebar = uniqueElement(root,"#sidebar");
  const toggle = uniqueElement(root,"#toggleBtn");
  if(!sidebar||!toggle)return;
  const icon = toggle?.querySelector("i");
  sidebar.classList.toggle("active", open);
  toggle.classList.remove("hidenone");
  toggle.setAttribute("role","button");
  toggle.setAttribute("tabindex","0");
  toggle.setAttribute("aria-controls","sidebar");
  toggle.setAttribute("aria-expanded",String(open));
  sidebar.setAttribute("aria-hidden",String(!open));
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
      setOpen(currentModal, false);
      setOpen(confirmation, true);
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
    setOpen(modal, false);
    setOpen(confirmation, true);
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

export function LegacyPage({ html, page, studentState="anonymous" }: Props) {
  const router = useRouter();
  const { open: sidebarOpen } = useStudentSidebarState();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root) setSidebarPresentation(root, sidebarOpen);
  }, [page, sidebarOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const abort = new AbortController();
    const options = { signal: abort.signal };
    root.dataset.interactionsReady = "true";

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
        setOpen(document.querySelector("#drawer"), true);
        setOpen(document.querySelector("#overlay"), true);
        return;
      }

      if (target.closest("#drawer .btn-toggle-mobile") || target.closest("#overlay")) {
        setOpen(document.querySelector("#drawer"), false);
        setOpen(document.querySelector("#overlay"), false);
        return;
      }

      const notification = target.closest(".header-notification-wrapper, .mobile-notification-wrapper");
      if (notification) {
        event.preventDefault();
        const menu = notification.parentElement?.querySelector<HTMLElement>(".site-notification-menu") ?? null;
        setOpen(menu, !menu?.classList.contains("open"));
        return;
      }

      if (link?.textContent?.includes("#purplePremium")) {
        const dropdown = link.parentElement?.querySelector<HTMLElement>(".dropdown-menu, #mobilePpDropdown") ?? null;
        if (dropdown) {
          event.preventDefault();
          const open = dropdown.style.display !== "block";
          dropdown.style.display = open ? "block" : "none";
          setOpen(dropdown, open);
          return;
        }
      }

      if (link?.textContent?.includes("#exploreCountries")) {
        const dropdown = link.parentElement?.querySelector<HTMLElement>(".explore-dropdown-menu, #mobileExploreDropdown") ?? null;
        if (dropdown) {
          event.preventDefault();
          const open = dropdown.style.display !== "block";
          dropdown.style.display = open ? "block" : "none";
          setOpen(dropdown, open);
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
          event.preventDefault();
          if (controlled.classList.contains("collapse")) {
            const open = !controlled.classList.contains("show");
            controlled.classList.toggle("show", open);
            controlled.style.display = open ? "block" : "none";
          } else {
            setOpen(controlled, true);
          }
          return;
        }
      }

      if (page === "scholarship" && target.closest(".graidant-border.cursor-pointer")) {
        event.preventDefault();
        setOpen(root.querySelector("#SCHOapplicantPremiumModal"), true);
        return;
      }

      if (target.closest(".btn-join")) {
        const modal = root.querySelector<HTMLElement>("#joinPremiumModal");
        if (modal) {
          event.preventDefault();
          setOpen(modal, true);
        }
        return;
      }

      if (target.closest('[data-text="Request it here"]')) {
        const modal = root.querySelector<HTMLElement>("#applicantPremiumModal");
        if (modal) {
          event.preventDefault();
          setOpen(modal, true);
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

      if (target.closest(".save-program, .save-course, .heart-icon, [data-save-id]")) {
        event.preventDefault();
        if (root.querySelector(".pgs-auth-account")) void saveCatalogItem(target);
        else setOpen(document.querySelector("#pgsLoginPopup"), true);
        return;
      }

      if (target.closest(".premium-video-play, [data-premium-video], [href='#premiumVideoOverlay']")) {
        event.preventDefault();
        setOpen(document.querySelector("#premiumVideoOverlay"), true);
        return;
      }

      const modalCta = target.closest<HTMLButtonElement>(".premium-modal-overlay .cta-btn");
      const modal = modalCta?.closest<HTMLElement>(".premium-modal-overlay");
      if (modalCta && modal) {
        event.preventDefault();
        void submitModalPanel(modal, page, modalCta);
        return;
      }

      if (target.closest(".premium-modal-close, .pgs-modal-close, .close-btn, [data-dismiss='modal']") || target.classList.contains("premium-modal-overlay")) {
        setOpen(target.closest<HTMLElement>(".premium-modal-overlay, .pgs-login-popup-overlay"), false);
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
      delete root.dataset.interactionsReady;
    };
  }, [page, router]);

  return <main ref={rootRef} data-legacy-page={page} data-student-state={studentState} dangerouslySetInnerHTML={{ __html: html }} />;
}
