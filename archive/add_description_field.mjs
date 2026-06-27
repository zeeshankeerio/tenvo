import fs from 'fs';

const filePath = 'prisma/schema.prisma';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to insert the description field just after category in businesses model
content = content.replace(
  /(\s*category\s+String)/,
  `$1\n  description             String?`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated schema.prisma with description field');
