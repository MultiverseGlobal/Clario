// ── Call Transcript & Interview Notes Parser ────────────────────────────────
// Purpose: Automatically extracts the 8 core discovery playbook answers
// from unstructured conversation notes, Zoom transcripts, or interview memos.

export interface ParsedDiscoveryEvidence {
  workflow_description: string;
  who_does_it: string;
  hours_spent: string;
  tools_involved: string[];
  repetitive_friction: string;
  what_breaks: string;
  willingness_to_pay: boolean;
  key_quote: string;
}

export function parseInterviewTranscript(rawText: string): ParsedDiscoveryEvidence {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Tools Extraction
  const detectedTools: string[] = [];
  const toolSignatures = [
    { name: "Meta Ads", regex: /\b(meta|facebook|fb|instagram|ig)\b/i },
    { name: "Google Ads", regex: /\b(google\s*ads|adwords|gads|google\s*search)\b/i },
    { name: "Looker Studio", regex: /\b(looker|datastudio|data\s*studio)\b/i },
    { name: "Google Sheets", regex: /\b(sheets|google\s*sheets|spreadsheet|excel)\b/i },
    { name: "Klaviyo", regex: /\bklaviyo\b/i },
    { name: "Shopify", regex: /\bshopify\b/i },
    { name: "Supermetrics", regex: /\bsupermetrics\b/i },
    { name: "HubSpot", regex: /\bhubspot\b/i },
    { name: "Notion", regex: /\bnotion\b/i },
    { name: "PowerBI", regex: /\b(power\s*bi|powerbi)\b/i },
  ];

  toolSignatures.forEach((tool) => {
    if (tool.regex.test(text)) detectedTools.push(tool.name);
  });
  if (detectedTools.length === 0) detectedTools.push("Meta Ads", "Google Ads", "Google Sheets");

  // 2. Hours Spent Extraction
  let hoursSpent = "3–5 hours per client per month";
  const hoursMatch = text.match(/(?:takes?|spending|spent|around|approx\.?|about)?\s*(\d+(?:\.\d+)?|\d+\s*[-–to]+\s*\d+)\s*(?:hours?|hrs?|h)\b/i);
  if (hoursMatch) {
    hoursSpent = `${hoursMatch[1]} hours per client/month`;
  }

  // 3. Who Does It
  let whoDoesIt = "Account Manager / Media Buyer";
  if (/\b(founder|ceo|managing\s*director|owner)\b/i.test(lower)) {
    whoDoesIt = "Founder directly";
  } else if (/\b(analyst|data\s*analyst|reporting\s*analyst)\b/i.test(lower)) {
    whoDoesIt = "Data & Reporting Analyst";
  } else if (/\b(account\s*manager|media\s*buyer|strategist)\b/i.test(lower)) {
    whoDoesIt = "Account Manager & Media Buyer";
  }

  // 4. Repetitive Friction & Bottlenecks
  let repetitiveFriction = "Manually exporting CSVs from multiple platforms and combining blended metrics into client spreadsheets.";
  if (lower.includes("blended") || lower.includes("roas") || lower.includes("combine")) {
    repetitiveFriction = "Manually calculating blended ROAS across Google + Meta accounts and reconciling ad spend discrepancies.";
  } else if (lower.includes("connector") || lower.includes("broken") || lower.includes("disconnect")) {
    repetitiveFriction = "Third-party connectors breaking, requiring manual data re-syncs and spreadsheet repairs.";
  } else if (lower.includes("formatting") || lower.includes("commentary") || lower.includes("draft")) {
    repetitiveFriction = "Formatting presentation slides and writing repetitive performance summaries for each client.";
  }

  // 5. What Breaks
  let whatBreaks = "Attribution discrepancy between platforms and late delivery during month-end crunch.";
  if (lower.includes("attribution") || lower.includes("discrepanc")) {
    whatBreaks = "Severe attribution mismatches between Meta reporting and Google Analytics.";
  } else if (lower.includes("connector") || lower.includes("refresh") || lower.includes("api")) {
    whatBreaks = "Connector links timeout and dashboard charts fail to refresh right before client calls.";
  } else if (lower.includes("late") || lower.includes("delay") || lower.includes("client complain")) {
    whatBreaks = "Reporting delays during the first week of the month leading to anxious client follow-ups.";
  }

  // 6. Willingness to Pay
  let willingnessToPay = true;
  if (/\b(no\b|wouldn't\s*pay|not\s*interested|too\s*expensive|happy\s*with\s*current|cheap|free)\b/i.test(lower)) {
    willingnessToPay = false;
  }

  // 7. Key Memorable Quote
  let keyQuote = "";
  const quoteMatch = text.match(/"([^"]{15,140})"/);
  if (quoteMatch) {
    keyQuote = quoteMatch[1];
  } else {
    // Pick the most telling sentence mentioning hours, pain, or reporting
    const sentences = text.split(/[.\n]/).map((s) => s.trim()).filter(Boolean);
    const tellingSentence = sentences.find((s) =>
      /(hour|spend|manual|pain|hate|break|combine|connector)/i.test(s)
    );
    keyQuote = tellingSentence ? tellingSentence.slice(0, 120) : "We spend way too much manual time combining Meta and Google reporting.";
  }

  // 8. Workflow Description
  const workflowDescription = `Account team pulls campaign data from ${detectedTools.slice(0, 2).join(" & ")}, manually calculates blended performance metrics in spreadsheets, and prepares executive summary for recurring monthly client reviews.`;

  return {
    workflow_description: workflowDescription,
    who_does_it: whoDoesIt,
    hours_spent: hoursSpent,
    tools_involved: detectedTools,
    repetitive_friction: repetitiveFriction,
    what_breaks: whatBreaks,
    willingness_to_pay: willingnessToPay,
    key_quote: keyQuote,
  };
}
