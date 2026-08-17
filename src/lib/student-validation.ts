import { isCrmStream, parseCrmTargetYear, type CrmStream } from "@/lib/operations-student-crm";

export type StudentProfileInput = {
  fullName: string;
  dialCode: string | null;
  phone: string | null;
  whatsapp: boolean | null;
  citizenshipCountry: string | null;
  preferredStudyCountry: string | null;
  studyLevel: string | null;
  crmStream?: CrmStream | null;
  crmTargetYear?: number | null;
  fieldInterest: string | null;
  workExperience: string | null;
  referralCode: string | null;
};

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, max) : null;
}

export function parseStudentProfile(value: unknown): StudentProfileInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid profile data.");
  const input = value as Record<string, unknown>;
  const fullName = clean(input.name ?? input.full_name, 255);
  if (!fullName || fullName.length < 2) throw new Error("Please enter your full name.");
  const phone = clean(input.number ?? input.phone, 20);
  if (phone && !/^[0-9+()\- ]{7,20}$/.test(phone)) throw new Error("Please enter a valid phone number.");
  const whatsappValue = clean(input.whatsapp, 8)?.toLowerCase();
  const hasStream = "crm_stream" in input || "stream" in input;
  const streamRaw = clean(input.crm_stream ?? input.stream, 20);
  const hasTargetYear = "crm_target_year" in input || "target_year" in input;
  const targetRaw = input.crm_target_year ?? input.target_year;
  return {
    fullName,
    dialCode: clean(input.dial_code, 8),
    phone,
    whatsapp: whatsappValue === "yes" ? true : whatsappValue === "no" ? false : null,
    citizenshipCountry: clean(input.country_code ?? input.citizenship_country, 120),
    preferredStudyCountry: clean(input.preferred_country_code ?? input.preferred_study_country, 120),
    studyLevel: clean(input.study_level, 80),
    crmStream: hasStream ? (streamRaw ? (isCrmStream(streamRaw) ? streamRaw : null) : null) : undefined,
    crmTargetYear: hasTargetYear
      ? parseCrmTargetYear(typeof targetRaw === "number" || typeof targetRaw === "string" ? targetRaw : null)
      : undefined,
    fieldInterest: clean(input.field_interest, 1000),
    workExperience: clean(input.work_experience, 1000),
    referralCode: clean(input.referral_code, 80)
  };
}

export function isProfileComplete(profile: StudentProfileInput): boolean {
  return Boolean(profile.fullName && profile.phone && profile.citizenshipCountry && profile.preferredStudyCountry && profile.studyLevel);
}
