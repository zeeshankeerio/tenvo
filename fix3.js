const fs = require('fs');

function replaceLine(filePath, lineNum, newText) {
  let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines[lineNum - 1] = newText;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

replaceLine('components/StockAdjustmentForm.jsx', 22, "    { value: 'expiry', label: 'Expired Stock', icon: '⏳', color: 'bg-amber-100 text-amber-700' },");
replaceLine('components/hr/AttendanceTracker.jsx', 15, "    absent: { label: 'Absent', icon: '❌', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },");
