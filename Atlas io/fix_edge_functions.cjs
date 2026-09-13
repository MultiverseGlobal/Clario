const fs = require('fs');
const path = require('path');

const edgeFuncsDir = path.join(__dirname, 'supabase', 'functions');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk(edgeFuncsDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace table names
  content = content.replace(/kuro_pipeline_view/g, 'atlas_opportunities');
  content = content.replace(/pipeline_crm/g, 'atlas_opportunities');
  
  // Replace stage updates/inserts
  content = content.replace(/stage:/g, 'pipeline_stage:');
  
  // Replace field names in payloads
  content = content.replace(/company:/g, 'organization_name:');
  content = content.replace(/website:/g, 'primary_domain:');
  content = content.replace(/notes:/g, 'deal_notes:');
  content = content.replace(/icp_score:/g, 'fit_score:');
  
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed edge functions!');
