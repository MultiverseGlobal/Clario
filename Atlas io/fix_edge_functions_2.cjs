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
  
  // Replace object accessors
  content = content.replace(/\.company\b/g, '.organization_name');
  content = content.replace(/\.website\b/g, '.primary_domain');
  content = content.replace(/\.notes\b/g, '.deal_notes');
  content = content.replace(/\.icp_score\b/g, '.fit_score');
  content = content.replace(/\.stage\b/g, '.pipeline_stage');
  
  // Destructuring fixes
  content = content.replace(/\{ company,/g, '{ organization_name: company,');
  content = content.replace(/, company,/g, ', organization_name: company,');
  content = content.replace(/\{ company /g, '{ organization_name: company ');
  content = content.replace(/, company /g, ', organization_name: company ');
  
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed edge functions accessors!');
