import { NextResponse } from "next/server";
import { INITIAL_VAULT_ITEMS } from "@/lib/vault";

let memoryVault = [...INITIAL_VAULT_ITEMS];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: memoryVault.length,
    vault: memoryVault
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceAppId, sourceAppName, category, title, summary, tags, data } = body;

    const newItem = {
      id: `ctx_${Date.now()}`,
      sourceAppId: sourceAppId || "unknown",
      sourceAppName: sourceAppName || "Ecosystem Client",
      category: category || "knowledge",
      title: title || "Automated Context Node",
      summary: summary || "",
      tags: tags || ["Auto"],
      createdAt: "Just now",
      syncedAcross: ["Metaphor OS", "Atlas io", "Orion", "Clario", "Pseudonyms ID"],
      data: data || {}
    };

    memoryVault = [newItem, ...memoryVault];

    return NextResponse.json({
      success: true,
      message: "Context node broadcasted to entire ecosystem",
      item: newItem
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
