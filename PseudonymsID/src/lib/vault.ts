import { VaultContextItem } from "./types";

export const INITIAL_VAULT_ITEMS: VaultContextItem[] = [
  {
    id: "ctx_01",
    sourceAppId: "metaphor",
    sourceAppName: "Metaphor OS",
    category: "knowledge",
    title: "Master Agency Acquisition SOP & Framework",
    summary: "Systematic multi-tier protocol for client acquisition, cold infrastructure, and conversion metrics.",
    tags: ["SOP", "Sales", "Agency", "Core"],
    createdAt: "10 mins ago",
    syncedAcross: ["Atlas io", "Orion", "Metaphor OS"],
    data: { docId: "agency_acquisition_sop_v1", importance: "critical" }
  },
  {
    id: "ctx_02",
    sourceAppId: "atlas",
    sourceAppName: "Atlas io",
    category: "lead",
    title: "High-Value Agency Pipeline (500 Enriched Prospects)",
    summary: "Qualified creative agency leads in UK & US market with verified decision-maker emails & pain points.",
    tags: ["Pipeline", "CRM", "Outreach", "Verified"],
    createdAt: "25 mins ago",
    syncedAcross: ["Metaphor OS", "Orion"],
    data: { leadsCount: 500, topVertical: "Design & AI Studios", status: "Outreach Ready" }
  },
  {
    id: "ctx_03",
    sourceAppId: "orion",
    sourceAppName: "Orion",
    category: "memory",
    title: "Executive Voice Reflection: Q3 Product Unification",
    summary: "Keynotes on unifying the entire suite under a single master sovereign account with instant token exchange.",
    tags: ["Voice", "Reflection", "Identity", "Architecture"],
    createdAt: "1 hour ago",
    syncedAcross: ["Metaphor OS", "Pseudonyms ID"],
    data: { audioLength: "3m 42s", sentiment: "Highly decisive" }
  },
  {
    id: "ctx_04",
    sourceAppId: "clario",
    sourceAppName: "Clario",
    category: "asset",
    title: "Procedural Brand Canvas & Motion Keyframes",
    summary: "Dynamic video composition with reactive audio spectrum visualization and high-contrast liquid typography.",
    tags: ["Canvas", "Video", "Motion", "Shader"],
    createdAt: "3 hours ago",
    syncedAcross: ["Metaphor OS"],
    data: { resolution: "4K UHD", renderStatus: "Realtime" }
  }
];
