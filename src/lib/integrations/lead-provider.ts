export type LeadSubmission = {
  kind: "enquiry" | "lead" | "study-journey" | "deadline-subscription";
  sourcePage: string;
  fields: Record<string, string | string[]>;
};

export type ProviderSubmissionResult = { status: "disabled" | "accepted"; provider: "zoho" };

export interface LeadProvider {
  submit(submission: LeadSubmission): Promise<ProviderSubmissionResult>;
}

class DisabledZohoProvider implements LeadProvider {
  async submit(_submission: LeadSubmission): Promise<ProviderSubmissionResult> {
    void _submission;
    return { status: "disabled", provider: "zoho" };
  }
}

// Zoho remains deliberately disabled until the owner supplies products, mappings,
// consent rules, routing and credentials. Database persistence is never skipped.
export const leadProvider: LeadProvider = new DisabledZohoProvider();
