import { describe, it, expect } from "vitest";
import { decomposeCampaignPrompt, discoverCampaignLeads, generateLeadOutreach } from "../services/campaignEngine";

describe("Campaign Engine Lead Discovery & Decomposition Verification", () => {
  it("flawlessly decomposes 'Primary ICP: US-based digital agencies with ~10-50 staff'", async () => {
    const prompt = "Primary ICP: US-based digital agencies with ~10-50 staff";
    const strategy = await decomposeCampaignPrompt(prompt);

    expect(strategy.channel).toBe("clutch");
    expect(strategy.keyword.toLowerCase()).toContain("digital agencies");
    expect(strategy.keyword).not.toContain("Primary ICP:");
    expect(strategy.keyword).not.toContain("~10-50");
    expect(strategy.min_headcount).toBe(10);
    expect(strategy.max_headcount).toBe(50);
    expect(strategy.regions).toContain("US");
    expect(strategy.industry).toBe("Marketing & Advertising");
  });

  it("discovers verified digital agencies without failing even when offline / without Gemini API key", async () => {
    const leads = await discoverCampaignLeads(
      "clutch",
      "US-based digital agencies",
      "Marketing & Advertising",
      {
        min_headcount: 10,
        max_headcount: 50,
        regions: ["US"],
        hypothesis: "Targeting delivery velocity bottlenecks and fixed-retainer margin pressure.",
      }
    );

    expect(leads.length).toBeGreaterThan(0);
    const first = leads[0];
    expect(first.company).toBeTruthy();
    expect(first.founder?.name).toBeTruthy();
    expect(first.founder?.email).toContain("@");
    expect(first.bottleneck).toBeTruthy();
    expect(first.icp_score).toBeGreaterThanOrEqual(80);
  });

  it("generates outreach copy with resilient local fallback", async () => {
    const mockLead = {
      company: "Clay Global",
      website: "https://clay.global",
      founder: { name: "Anton Lapshin", email: "anton.lapshin@clay.global", role: "Founder & Design Director" },
      founder_thesis: "Bespoke digital product design, UI/UX architecture, and brand strategy.",
      bottleneck: "Scaling sprint velocity and design-system handoffs while maintaining boutique craft quality.",
      source: "Clutch Directory",
      icp_score: 95,
      confidence_score: 92,
    };

    const draft = await generateLeadOutreach(
      mockLead,
      "Targeting delivery velocity bottlenecks and fixed-retainer margin pressure."
    );

    expect(draft.subject).toBeTruthy();
    expect(draft.body).toContain("Clay Global");
    expect(draft.body).toContain("Anton");
    expect(draft.linkedin_dm).toBeTruthy();
  });
});
