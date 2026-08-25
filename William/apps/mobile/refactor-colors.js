const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  // Exclude colors.ts and SpringButton.ts
  if (filePath.includes('colors.ts') || filePath.includes('SpringButton.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;

  // Find all TouchableOpacity
  if (content.includes('<TouchableOpacity')) {
    content = content.replace(/<TouchableOpacity/g, '<SpringButton');
    content = content.replace(/<\/TouchableOpacity>/g, '</SpringButton>');
    content = content.replace(/import {.*?TouchableOpacity.*?}.*?;/g, (match) => {
      // Remove TouchableOpacity from the import
      const newMatch = match.replace('TouchableOpacity,', '').replace(', TouchableOpacity', '').replace('TouchableOpacity', '');
      if (newMatch.includes('{  }') || newMatch.includes('{}')) {
        return '';
      }
      return newMatch;
    });

    if (!content.includes('import { SpringButton }')) {
      const depth = filePath.split(path.sep).length - srcDir.split(path.sep).length - 1;
      const relPath = depth === 0 ? './components/SpringButton' : '../'.repeat(depth) + 'components/SpringButton';
      content = `import { SpringButton } from '${relPath}';\n` + content;
    }
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated TouchableOpacity in ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
