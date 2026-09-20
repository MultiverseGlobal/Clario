import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveCampaign,
  saveActiveCampaign,
  setActiveCampaignStage,
  addProspectToCampaign,
  updateProspectStatus,
  addDiscoveryNoteToCampaign,
  setDecisionGateOutcome,
  addDeliveryMetric,
  addCaseStudy,
  resetCampaignToPlaybookDefault,
  createCustomValidationCampaign,
} from "../services/campaignValidationStore";

describe("Validation Campaign Engine Store", () => {
  beforeEach(() => {
    resetCampaignToPlaybookDefault();
  });

  it("initializes with default playbook parameters", () => {
    const campaign = getActiveCampaign();
    expect(campaign.name).toBe("Agency Reporting Validation");
    expect(campaign.type).toBe("validation_to_first_client");
    expect(campaign.active_stage).toBe(1);
    expect(campaign.scoreboard.agencies_researched.target).toBe(40);
    expect(campaign.scoreboard.personalised_outreaches.target).toBe(25);
    expect(campaign.scoreboard.discovery_conversations.target).toBe(8);
    expect(campaign.sprint_milestone.target_agencies).toBe(10);
    expect(campaign.sprint_milestone.target_contacted).toBe(5);
    expect(campaign.prospects.length).toBeGreaterThanOrEqual(3);
  });

  it("adds a new prospect and updates scoreboard reactively", () => {
    const initialCount = getActiveCampaign().prospects.length;
    addProspectToCampaign({
      company: "Apex Media Group",
      website: "https://apexmedia.test",
      founder_name: "Sarah Connor",
      founder_role: "Founder",
      founder_email: "sarah@apexmedia.test",
      source: "Clutch",
      status: "researched",
      team_size: "10 employees",
    });

    const updated = getActiveCampaign();
    expect(updated.prospects.length).toBe(initialCount + 1);
    expect(updated.scoreboard.agencies_researched.current).toBe(initialCount + 1);
  });

  it("updates prospect status to contacted and increments outreach scoreboard", () => {
    const campaign = getActiveCampaign();
    const prospect = campaign.prospects[0];
    updateProspectStatus(prospect.id, "contacted");

    const updated = getActiveCampaign();
    const p = updated.prospects.find((x) => x.id === prospect.id);
    expect(p?.status).toBe("contacted");
    expect(p?.contacted_at).toBeDefined();
    expect(updated.scoreboard.personalised_outreaches.current).toBeGreaterThanOrEqual(1);
  });

  it("logs discovery notes and records willingness to pay", () => {
    addDiscoveryNoteToCampaign({
      company: "Aura Growth Lab",
      contact_name: "Marcus Vance",
      workflow_description: "Consolidates Meta + Google ads into Google Sheets",
      who_does_it: "Account Manager",
      hours_spent: "4 hours",
      tools_involved: ["Meta Ads", "Google Ads", "Looker"],
      repetitive_friction: "Combining blended ROAS manually",
      what_breaks: "Attribution discrepancies",
      willingness_to_pay: true,
      notes: "Would gladly pay $400 to remove this",
    });

    const updated = getActiveCampaign();
    expect(updated.discovery_notes.length).toBe(1);
    expect(updated.discovery_notes[0].willingness_to_pay).toBe(true);
    expect(updated.scoreboard.discovery_conversations.current).toBe(1);
  });

  it("evaluates Decision Gate outcome and auto-advances on strong repetition", () => {
    setDecisionGateOutcome("strong_repetition", "5 of 6 agencies confirmed severe reporting pain.");
    const updated = getActiveCampaign();
    expect(updated.decision_gate.status).toBe("strong_repetition");
    expect(updated.active_stage).toBe(5); // Advances to Build Demo
  });

  it("records delivery metrics and verifies before/after time reduction", () => {
    addDeliveryMetric({
      company: "Beacon Performance",
      hours_before: 4.0,
      hours_after: 0.8,
      steps_before: 17,
      steps_after: 4,
      people_before: 2,
      people_after: 1,
      verified: true,
    });

    const updated = getActiveCampaign();
    expect(updated.delivery_metrics.length).toBe(1);
    expect(updated.delivery_metrics[0].hours_before).toBe(4.0);
    expect(updated.delivery_metrics[0].hours_after).toBe(0.8);
  });

  it("creates custom validation campaign from prompt parameters", () => {
    const custom = createCustomValidationCampaign({
      name: "E-Commerce Retention Pilot",
      hypothesis: "Validate whether DTC brands struggle with retention flows",
      industry: "DTC E-Commerce",
      headcount: "5–20 employees",
      workflow: "Klaviyo retention flows",
      data_sources: ["Klaviyo", "Shopify"],
      pilot_price_usd: 500,
      discovery_target: 10,
    });

    expect(custom.name).toBe("E-Commerce Retention Pilot");
    expect(custom.pilot_offer.price_usd).toBe(500);
    expect(custom.scoreboard.discovery_conversations.target).toBe(10);
    expect(custom.micro_demo.inputs).toEqual(["Klaviyo", "Shopify"]);
    expect(getActiveCampaign().id).toBe(custom.id);
  });
});
