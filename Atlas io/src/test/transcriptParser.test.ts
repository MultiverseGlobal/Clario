import { describe, it, expect } from "vitest";
import { parseInterviewTranscript } from "../services/transcriptParser";
import {
  getActiveCampaign,
  enrichProspectWithFounder,
  resetCampaignToPlaybookDefault,
} from "../services/campaignValidationStore";

describe("Atlas Perfection Enhancements: Transcript Parser & Enrichment", () => {
  it("parses raw meeting notes into the 8 core discovery playbook fields", () => {
    const rawNotes = `
      Call with Elena from Beacon Media (11 employees).
      They manage Meta Ads and Google Ads for DTC fashion clients.
      Account managers spend 4 hours pulling ad data into Google Sheets.
      The Looker connector breaks almost every month-end.
      She said: "Combining blended ROAS across accounts manually is our biggest headache."
      She confirmed they would easily pay $400 for a micro-solution that removes the friction.
    `;

    const parsed = parseInterviewTranscript(rawNotes);

    expect(parsed.tools_involved).toContain("Meta Ads");
    expect(parsed.tools_involved).toContain("Google Ads");
    expect(parsed.hours_spent).toContain("4 hours");
    expect(parsed.who_does_it).toContain("Account Manager");
    expect(parsed.willingness_to_pay).toBe(true);
    expect(parsed.repetitive_friction.toLowerCase()).toContain("blended");
    expect(parsed.key_quote).toContain("Combining blended ROAS");
  });

  it("enriches prospect with verified founder leadership data", () => {
    resetCampaignToPlaybookDefault();
    const campaign = getActiveCampaign();
    const prospect = campaign.prospects[0];

    enrichProspectWithFounder(prospect.id, {
      founder_email: "marcus.vance@auragrowth.io",
      founder_linkedin: "https://linkedin.com/in/marcus-vance-verified",
      founder_role: "Managing Director & Performance Lead",
      notes: "Verified leadership profile",
    });

    const updated = getActiveCampaign();
    const enriched = updated.prospects.find((p) => p.id === prospect.id);
    expect(enriched?.founder_email).toBe("marcus.vance@auragrowth.io");
    expect(enriched?.founder_linkedin).toBe("https://linkedin.com/in/marcus-vance-verified");
    expect(enriched?.founder_role).toBe("Managing Director & Performance Lead");
  });
});
