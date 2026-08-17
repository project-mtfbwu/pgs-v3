"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  resolveStudentSidebarOpen,
  studentSidebarDesktopQuery,
  studentSidebarStorageKey
} from "@/lib/student-sidebar-state";

type StudentSidebarState = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const standaloneSidebarState: StudentSidebarState = {
  open: false,
  toggle: () => undefined,
  setOpen: () => undefined
};

const StudentSidebarStateContext = createContext<StudentSidebarState>(standaloneSidebarState);

export function StudentSidebarStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback((nextOpen: boolean) => {
    if (window.matchMedia(studentSidebarDesktopQuery).matches) {
      window.sessionStorage.setItem(studentSidebarStorageKey, nextOpen ? "open" : "closed");
    }
    setOpenState(nextOpen);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((currentOpen) => {
      const nextOpen = !currentOpen;
      if (window.matchMedia(studentSidebarDesktopQuery).matches) {
        window.sessionStorage.setItem(studentSidebarStorageKey, nextOpen ? "open" : "closed");
      }
      return nextOpen;
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia(studentSidebarDesktopQuery);
    const syncWithViewport = () => {
      setOpenState(resolveStudentSidebarOpen(
        media.matches,
        window.sessionStorage.getItem(studentSidebarStorageKey)
      ));
    };
    syncWithViewport();
    media.addEventListener("change", syncWithViewport);
    return () => media.removeEventListener("change", syncWithViewport);
  }, []);

  useEffect(() => {
    if (window.matchMedia(studentSidebarDesktopQuery).matches) return;
    const frame = window.requestAnimationFrame(() => setOpenState(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const ownSidebarClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest("#toggleBtn, #sidebar #close_Btn");
      const root = control?.closest<HTMLElement>("[data-legacy-page], .developer-student-shell");
      if (!control || !root) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const sidebar = root.querySelector<HTMLElement>("#sidebar");
      const trigger = root.querySelector<HTMLElement>("#toggleBtn");
      const nextOpen = control.id === "toggleBtn"
        ? trigger?.getAttribute("aria-expanded") !== "true"
        : false;
      sidebar?.classList.toggle("active", nextOpen);
      sidebar?.setAttribute("aria-hidden", String(!nextOpen));
      trigger?.setAttribute("aria-expanded", String(nextOpen));
      setOpen(nextOpen);
    };
    document.addEventListener("click", ownSidebarClick, true);
    return () => document.removeEventListener("click", ownSidebarClick, true);
  }, [setOpen]);

  const value = useMemo(() => ({ open, toggle, setOpen }), [open, setOpen, toggle]);
  return <StudentSidebarStateContext.Provider value={value}>{children}</StudentSidebarStateContext.Provider>;
}

export function useStudentSidebarState(): StudentSidebarState {
  return useContext(StudentSidebarStateContext);
}
