const fs = require('fs');

function replaceLine(filePath, lineNum, newText) {
  let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines[lineNum - 1] = newText;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

replaceLine('components/StockAdjustmentForm.jsx', 24, "    { value: 'write_off', label: 'Write-Off', icon: '📉', color: 'bg-gray-100 text-gray-700' },");
replaceLine('components/StockAdjustmentForm.jsx', 25, "    { value: 'found', label: 'Found Stock', icon: '🔍', color: 'bg-emerald-100 text-emerald-700' },");
replaceLine('components/InventoryManager.jsx', 672, "      toast.success(\"Filters focused\", { icon: '🔍' });");
replaceLine('components/inventory/SerialScanner.jsx', 103, "                // 🛡️ DEFENSIVE CHECK");
replaceLine('components/inventory/SerialScanner.jsx', 169, "            // 🛡️ DEFENSIVE CHECK");
replaceLine('components/pos/SuperStorePOS.jsx', 24, "    { key: 'snacks', label: 'Snacks', icon: '🍿', color: 'bg-orange-500' },");
replaceLine('components/pos/SuperStorePOS.jsx', 28, "    { key: 'bakery', label: 'Bakery', icon: '🍞', color: 'bg-amber-500' },");
