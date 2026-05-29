import fs from 'fs';
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const match = schema.match(/model\s+notifications\s+\{[\s\S]*?\}/i);
if (match) {
  console.log(match[0]);
} else {
  console.log("No match found.");
}
