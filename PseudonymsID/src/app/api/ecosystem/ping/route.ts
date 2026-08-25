import { NextResponse } from "next/server";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    ecosystem_version: "2026.1",
    active_apps: ECOSYSTEM_APPS.filter(a => a.status === "live").length,
    registered_apps: ECOSYSTEM_APPS.length,
    master_account: "multiverseglobals@gmail.com"
  });
}
