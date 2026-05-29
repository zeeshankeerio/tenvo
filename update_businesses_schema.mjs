import fs from 'fs';

const filePath = 'prisma/schema.prisma';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to insert the fields just before created_at in the businesses model
content = content.replace(
  /(\s*created_at\s+DateTime\?\s+@default\(now\(\)\)\s+@db\.Timestamptz\(6\))/g,
  `
  cover_image_url         String?
  website                 String?
  is_active               Boolean?                  @default(true)
  is_verified             Boolean?                  @default(false)$1`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated schema.prisma with business fields');
