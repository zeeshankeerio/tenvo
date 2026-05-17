const fs = require('fs');

function fixFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [bad, good] of replacements) {
    if (content.includes(bad)) {
      content = content.replaceAll(bad, good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed: ' + file);
  } else {
    console.log('No changes needed in: ' + file);
  }
}

fixFile('components/StockAdjustmentForm.jsx', [
  ['ðŸš¨', '🚨'],
  ['â °', '⏳'],
  ['ðŸ§ª', '🧪'],
  ['ðŸ“ ', '📉'],
  ['ðŸ” ', '🔍'],
  ['ðŸ“Š', '📊'],
  ['ðŸ“‹', '📋']
]);

fixFile('components/InventoryManager.jsx', [
  ['â Œ', '❌'],
  ['ðŸ” ', '🔍']
]);

fixFile('components/hr/AttendanceTracker.jsx', [
  ['â Œ', '❌'],
  ['ðŸ”¶', '🌗'],
  ['ðŸ–ï¸', '🌴'],
  ['ðŸŽ‰', '🎉']
]);

fixFile('components/workflow/ApprovalInbox.jsx', [
  ['ðŸŽ‰', '🎉']
]);

fixFile('components/pos/SuperStorePOS.jsx', [
  ['ðŸª', '🛍️'],
  ['ðŸ¥¤', '🥤'],
  ['ðŸ ¿', '🍿'],
  ['ðŸ¥›', '🥛'],
  ['ðŸ§Š', '🧊'],
  ['ðŸ¥¬', '🥬'],
  ['ðŸ ž', '🍞'],
  ['ðŸ ', '🏠'],
  ['ðŸ§´', '🧼'],
  ['ðŸ¥©', '🥩']
]);

fixFile('components/pos/PosTerminal.jsx', [
  ['ðŸ“¦', '📦']
]);

fixFile('components/intelligence/AIInsightsPanel.jsx', [
  ['ðŸ”´', '🔴'],
  ['ðŸŸ¡', '🟡']
]);

fixFile('components/inventory/SerialScanner.jsx', [
  ['ðŸ›¡ï¸ ', '🛡️ ']
]);

fixFile('components/crm/LoyaltyManager.jsx', [
  ['ðŸŽ‰', '🎉']
]);
