const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    // gradients
    .replace(/bg-gradient-to-[a-z]+ from-wine-[0-9]+ to-wine-[0-9]+/g, 'bg-brand-primary')
    .replace(/bg-gradient-to-[a-z]+ from-wine-[0-9]+ via-wine-[0-9]+ to-wine-[0-9]+/g, 'bg-brand-primary')
    .replace(/bg-gradient-to-[a-z]+ from-wine-[0-9]+ to-indigo-[0-9]+/g, 'bg-brand-primary')
    .replace(/bg-gradient-to-[a-z]+ from-wine-[0-9]+ via-white to-gray-[0-9]+/g, 'bg-brand-50')
    .replace(/bg-gradient-to-[a-z]+ from-wine-50 to-white/g, 'bg-brand-50')
    // colors
    .replace(/wine-500/g, 'brand-primary')
    .replace(/wine-600/g, 'brand-primary')
    .replace(/wine-700/g, 'brand-primary-dark')
    .replace(/wine-50/g, 'brand-50')
    .replace(/wine-100/g, 'brand-100')
    .replace(/wine-200/g, 'brand-200')
    .replace(/wine-300/g, 'brand-300')
    .replace(/wine-400/g, 'brand-primary')
    .replace(/wine-800/g, 'brand-primary-dark')
    .replace(/wine-900/g, 'brand-primary-dark');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      replaceInFile(filePath);
    }
  }
}

walk('e:/tenvo-main/components/marketing');
walk('e:/tenvo-main/app');
walk('e:/tenvo-main/components/domain');
