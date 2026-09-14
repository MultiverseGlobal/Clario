const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const env = fs.readFileSync(envPath, 'utf-8');
const anonKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, anonKey);

async function test() {
  console.log("=== 0. Listing models from Gemini ===");
  try {
    const listRes = await supabase.functions.invoke('sourcing-machine', {
      body: { action: 'list-models' }
    });
    console.log("All Gemini models:", (listRes.data?.geminiModels?.models || []).map(m => m.name.replace('models/', '')));
  } catch (e) {
    console.error("list-models error:", e);
  }
  try {
    const decRes = await supabase.functions.invoke('sourcing-machine', {
      body: { action: 'decompose-prompt', prompt: 'Cold outreach to creative design agency founders 10-5' }
    });
    console.log("decompose-prompt result:", JSON.stringify(decRes.data || decRes.error, null, 2));
  } catch (err) {
    console.error("decompose-prompt error:", err);
  }

  console.log("\n=== 2. Testing discover-leads with real AI ===");
  try {
    const leadRes = await supabase.functions.invoke('sourcing-machine', {
      body: { action: 'discover-leads', source: 'yc', keyword: 'AI developer tools', industry: 'Technology' }
    });
    console.log("discover-leads res data:", JSON.stringify(leadRes.data, null, 2));
    if (leadRes.error) {
      console.log("discover-leads res error:", leadRes.error.message);
      if (leadRes.error.context && typeof leadRes.error.context.json === 'function') {
        const errJson = await leadRes.error.context.json();
        console.log("discover-leads error details:", JSON.stringify(errJson, null, 2));
      }
    }
  } catch (err) {
    console.error("discover-leads error:", err);
  }

  console.log("\n=== 3. Testing send-email (Gmail SMTP + BCC audit) ===");
  try {
    const emailRes = await supabase.functions.invoke('send-email', {
      body: {
        to_email: 'multiverseglobals@gmail.com',
        subject: 'Atlas System Verification: SMTP + BCC Audit Active',
        body: 'This email confirms that the Atlas live outreach pipeline is now routing via verified Gmail SMTP with real-time audit copies.',
        sender_name: 'Atlas Autopilot Test'
      }
    });
    console.log("send-email response:", JSON.stringify(emailRes.data || emailRes.error, null, 2));
  } catch (err) {
    console.error("send-email error:", err);
  }
}

test();
