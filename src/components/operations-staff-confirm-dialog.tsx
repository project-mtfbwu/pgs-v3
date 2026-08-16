"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OperationsStaffAccessSummary } from "@/components/operations-staff-access-summary";
import {
  isPrivilegeBroadening,
  normalizeStaffEmail,
  privilegeBroadeningWarning,
  type StaffDirectoryRole,
  type StaffSurfaceAccess
} from "@/lib/operations-staff-access";

export function OperationsStaffConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  beforeAccess,
  afterAccess,
  warning,
  confirmLabel,
  destructive = false,
  requireEmail,
  currentEmail,
  previousRole,
  nextRole,
  pending,
  error,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  beforeAccess?: StaffSurfaceAccess;
  afterAccess?: StaffSurfaceAccess;
  warning?: string;
  confirmLabel: string;
  destructive?: boolean;
  requireEmail?: boolean;
  currentEmail?: string | null;
  previousRole?: string | null;
  nextRole?: StaffDirectoryRole;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  const [typedEmail, setTypedEmail] = useState("");
  const needsTypedEmail = Boolean(
    requireEmail
    || (nextRole && isPrivilegeBroadening(previousRole ?? null, nextRole))
  );
  const emailMatches = !needsTypedEmail
    || (currentEmail && normalizeStaffEmail(typedEmail) === normalizeStaffEmail(currentEmail));

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTypedEmail("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {beforeAccess ? <OperationsStaffAccessSummary access={beforeAccess} heading="Current access" /> : null}
        {afterAccess ? <OperationsStaffAccessSummary access={afterAccess} heading="Access after this change" /> : null}
        {warning ? <p className="ops-team-warning" role="status">{warning}</p> : null}
        {nextRole && isPrivilegeBroadening(previousRole ?? null, nextRole) ? (
          <p className="ops-team-warning" role="status">{privilegeBroadeningWarning(previousRole ?? null, nextRole)}</p>
        ) : null}
        {needsTypedEmail ? (
          <label className="ops-team-field">
            <span>Type this staff member’s email to confirm</span>
            <Input
              autoComplete="off"
              name="confirmation_email"
              type="email"
              value={typedEmail}
              onChange={(event) => setTypedEmail(event.target.value)}
            />
          </label>
        ) : null}
        {error ? <p className="ops-team-error" role="alert">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="ops:inline-flex ops:h-11 ops:items-center ops:justify-center ops:rounded-md ops:border ops:border-border ops:bg-card ops:px-4 ops:text-sm ops:font-medium">
            Cancel
          </AlertDialogCancel>
          <Button
            className={destructive ? "ops-team-destructive" : undefined}
            disabled={pending || !emailMatches}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
