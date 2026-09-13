const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching old pipeline data...');
  const { data: oldData, error: fetchErr } = await supabase.from('kuro_pipeline_view').select('*');
  
  if (fetchErr) {
    console.error('Error fetching data:', fetchErr);
    process.exit(1);
  }
  
  if (!oldData || oldData.length === 0) {
    console.log('No data to migrate.');
    process.exit(0);
  }

  console.log(`Migrating ${oldData.length} opportunities...`);

  const mappedData = oldData.map(row => {
    let newStage = 'discovered';
    const stage = row.stage || '';
    if (['won', 'paid', 'complete'].includes(stage)) newStage = 'closed_won';
    else if (['Sourced', 'new', 'uncontacted'].includes(stage)) newStage = 'discovered';
    else if (['call_booked', 'call_completed', 'pain_confirmed', 'proposal_sent', 'negotiating'].includes(stage)) newStage = 'engaged';
    else if (['lost', 'not_interested'].includes(stage)) newStage = 'closed_lost';

    return {
      id: row.id,
      user_id: row.user_id,
      organization_name: row.company || 'Unknown',
      primary_domain: row.website || '',
      deal_notes: row.notes || null,
      pipeline_stage: newStage,
      fit_score: row.icp_score || 50,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
  });

  const { data: inserted, error: insertErr } = await supabase
    .from('atlas_opportunities')
    .upsert(mappedData, { onConflict: 'id' });

  if (insertErr) {
    console.error('Migration failed:', insertErr);
    process.exit(1);
  }

  console.log('Successfully migrated data!');
}

run();
