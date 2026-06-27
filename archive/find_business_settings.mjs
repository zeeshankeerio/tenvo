import fs from 'fs';
const lines = fs.readFileSync('prisma/schema.prisma', 'utf8').split('\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('model business_settings {')) {
    start = i + 1;
  }
  if (start !== -1 && lines[i].trim() === '}') {
    end = i + 1;
    break;
  }
}
console.log(`StartLine: ${start}`);
console.log(`EndLine: ${end}`);
