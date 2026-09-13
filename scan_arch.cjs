const fs = require('fs');
const path = require('path');

function getFiles(dir, filter) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory() && !file.includes('node_modules')) { 
        results = results.concat(getFiles(file, filter));
      } else { 
        if (file.endsWith(filter)) results.push(file);
      }
    });
  } catch(e) {}
  return results;
}

const atlasPages = getFiles(path.join(__dirname, 'Atlas io', 'src', 'pages'), '.tsx').map(f => path.basename(f));
const clarioPages = getFiles(path.join(__dirname, 'Clario', 'src'), '.tsx').map(f => path.basename(f));
const atlasEdges = getFiles(path.join(__dirname, 'Atlas io', 'supabase', 'functions'), 'index.ts').map(f => path.basename(path.dirname(f)));
const clarioEdges = getFiles(path.join(__dirname, 'Clario', 'server'), '.py').map(f => path.basename(f));

console.log(JSON.stringify({ atlasPages, clarioPages, atlasEdges, clarioEdges }, null, 2));
