import type { NextRequest } from "next/server";
import { handlePublicSubmission } from "@/lib/public-submissions";

export async function POST(request: NextRequest) { return handlePublicSubmission(request, "study-journey"); }
