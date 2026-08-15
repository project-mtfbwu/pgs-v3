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
};

const standaloneSidebarState: StudentSidebarState = {
  open: false,
  toggle: () => undefined
};

const StudentSidebarStateContext = createContext<StudentSidebarState>(standaloneSidebarState);

export function StudentSidebarStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);

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
      if (!control?.closest("[data-legacy-page], .developer-student-shell")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    };
    document.addEventListener("click", ownSidebarClick, true);
    return () => document.removeEventListener("click", ownSidebarClick, true);
  }, [toggle]);

  const value = useMemo(() => ({ open, toggle }), [open, toggle]);
  return <StudentSidebarStateContext.Provider value={value}>{children}</StudentSidebarStateContext.Provider>;
}

export function useStudentSidebarState(): StudentSidebarState {
  return useContext(StudentSidebarStateContext);
}
