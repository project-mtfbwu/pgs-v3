import type { NextRequest } from "next/server";
import { publicSearch } from "@/lib/public-search";

export async function GET(request: NextRequest) { return publicSearch(request); }
