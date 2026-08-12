"use client";

import { useEffect } from "react";

type Props = { html: string; page: "home" | "countriesusa" };

function setOpen(element: HTMLElement | null, open: boolean) {
  if (!element) return;
  element.classList.toggle("open", open);
  element.classList.toggle("active", open);
  if (element.classList.contains("pgs-modal") || element.classList.contains("premium-modal-overlay")) {
    element.style.display = open ? "flex" : "none";
  }
}

export function LegacyPage({ html, page }: Props) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-legacy-page="${page}"]`);
    if (!root) return;

    const abort = new AbortController();
    const options = { signal: abort.signal };

    root.addEventListener("submit", (event) => event.preventDefault(), options);
    root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>("a");
      const button = target.closest<HTMLButtonElement>("button");

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

      if (target.closest('[data-text="Request it here"]')) {
        const modal = root.querySelector<HTMLElement>("#applicantPremiumModal");
        if (modal) {
          event.preventDefault();
          setOpen(modal, true);
        }
        return;
      }

      if (target.closest(".premium-unlock-link, [href='#contact']")) {
        const modal = root.querySelector<HTMLElement>("#ppPremiumModal, #countriesUsaJoinPremiumModal, #joinPremiumModal");
        if (modal) {
          event.preventDefault();
          setOpen(modal, true);
        }
        return;
      }

      if (target.closest(".premium-modal-close") || (target.classList.contains("premium-modal-overlay"))) {
        setOpen(target.closest<HTMLElement>(".premium-modal-overlay"), false);
      }
    }, options);

    return () => abort.abort();
  }, [page]);

  return <main data-legacy-page={page} dangerouslySetInnerHTML={{ __html: html }} />;
}
