import { describe, it, expect } from "vitest";
import { decomposeCampaignPrompt, discoverCampaignLeads, generateLeadOutreach, runMultiPlatformRecon } from "../services/campaignEngine";

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
    expect(draft.human_summary).toBeTruthy();
    expect(draft.loom_script).toBeTruthy();
    expect(draft.word_count).toBeLessThanOrEqual(130);
    expect(draft.linkedin_word_count).toBeLessThanOrEqual(60);
  });

  it("strictly excludes out-of-scale enterprise agencies (e.g. Huge Inc) for boutique 10-50 headcount ICP", async () => {
    const leads = await discoverCampaignLeads(
      "clutch",
      "Digital Agencies",
      "Marketing & Advertising",
      {
        min_headcount: 10,
        max_headcount: 50,
        regions: ["US"],
      }
    );

    const hugeMatch = leads.find((l) => l.company.toLowerCase().includes("huge"));
    expect(hugeMatch).toBeUndefined();

    // Verify all returned leads have valid v3 qualification and domain deduplication
    const domains = new Set<string>();
    for (const lead of leads) {
      const d = lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      expect(domains.has(d)).toBe(false);
      domains.add(d);

      expect(lead.qualification).toBeDefined();
      expect(lead.qualification?.status).toBe("QUALIFIED");
      expect(lead.contact).toBeDefined();
      expect(lead.recon).toBeDefined();
    }
  });

  it("decomposes unstructured brief and outputs plain_english_summary restatement", async () => {
    const brief = "find me small marketing agencies in Nigeria and Kenya, I do AI automation for agencies";
    const strategy = await decomposeCampaignPrompt(brief);

    expect(strategy.plain_english_summary).toBeTruthy();
    expect(strategy.industry).toBe("Marketing & Advertising");
    expect(strategy.targetCount).toBe(10);
    expect(strategy.channel).toBe("clutch");
  });

  it("harvests multi-platform signals across website, hiring, reviews, and tech stack", async () => {
    const targetLead = {
      company: "Apex Design Co",
      website: "https://apexdesign.co",
      bottleneck: "Client onboarding bottlenecks and sprint review delays",
    };

    const recon = await runMultiPlatformRecon(targetLead, {
      focusHypothesis: "Automating sprint reporting and design token handoffs",
    });

    expect(recon.signals).toBeDefined();
    expect(recon.signals.website).toBeDefined();
    expect(recon.signals.hiring).toBeDefined();
    expect(recon.signals.reviews).toBeDefined();
    expect(recon.signals.tech_stack).toBeDefined();

    // Verify source evidence attribution
    expect(recon.problem_evidence.length).toBeGreaterThan(0);
    const sourceTypes = recon.problem_evidence.map((e) => e.source_type);
    expect(sourceTypes).toContain("official_website");
    expect(sourceTypes).toContain("job_board");
    expect(sourceTypes).toContain("review_directory");

    expect(recon.likely_operational_problem).toBeTruthy();
    expect(recon.opportunity_hypothesis).toBeTruthy();
  });
});
