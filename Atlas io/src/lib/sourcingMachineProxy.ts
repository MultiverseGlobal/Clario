import { decomposePromptWithGemini, discoverLeadsWithGemini, draftOutreachWithGemini } from "./gemini";
import { runMultiPlatformRecon } from "../services/campaignEngine";

export async function invokeSourcingMachine(payload: any): Promise<{ data: any, error: any }> {
  try {
    const { action } = payload.body;

    if (action === "decompose-prompt") {
      const data = await decomposePromptWithGemini(
        payload.body.prompt,
        payload.body.min_headcount || 5,
        payload.body.max_headcount || 30,
        payload.body.regions || ["US", "UK"]
      );
      return { data, error: null };
    }

    if (action === "discover-leads") {
      const data = await discoverLeadsWithGemini(
        payload.body.source || "clutch",
        payload.body.keyword || "Startups",
        payload.body.industry || "Technology",
        payload.body.min_headcount || 5,
        payload.body.max_headcount || 30,
        payload.body.regions || ["US", "UK"],
        payload.body.hypothesis
      );
      return { data, error: null };
    }

    if (action === "draft-outreach") {
      const draft = await draftOutreachWithGemini(
        payload.body.lead,
        payload.body.campaign_hypothesis
      );
      return { data: { draft }, error: null };
    }

    if (action === "multiplatform-recon") {
      const data = await runMultiPlatformRecon(payload.body.lead, {
        focusHypothesis: payload.body.hypothesis,
      });
      return { data, error: null };
    }

    // Unrecognized action
    return { data: null, error: new Error(`Unrecognized action: ${action}`) };
  } catch (err) {
    console.error("[SourcingMachineProxy] Error:", err);
    return { data: null, error: err };
  }
}
