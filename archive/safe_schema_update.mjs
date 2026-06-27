import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add missing fields to businesses model
// Find the businesses model block
const businessModelRegex = /(model\s+businesses\s+\{[\s\S]*?\})/;
const match = content.match(businessModelRegex);

if (match) {
  let businessBlock = match[0];
  
  // Check if we already added it
  if (!businessBlock.includes('is_active')) {
    // Insert right before logo_url or created_at
    businessBlock = businessBlock.replace(
      /(\s*created_at\s+DateTime\?)/,
      `
  cover_image_url         String?
  website                 String?
  is_active               Boolean?                  @default(true)
  is_verified             Boolean?                  @default(false)$1`
    );
    
    content = content.replace(businessModelRegex, businessBlock);
    console.log('Added missing fields to businesses model.');
  }
} else {
  console.log('Could not find businesses model!');
}

// 2. Add notifications model if not exists
if (!content.includes('model notifications {')) {
  const notificationsModel = `
model notifications {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @db.Uuid
  user_id      String?
  title        String
  message      String
  type         String?
  is_read      Boolean    @default(false)
  link         String?
  
  // Enterprise fields
  action_url   String?
  metadata     Json?      @default("{}")
  is_dismissed Boolean    @default(false)
  priority     String?    @default("medium")
  read_at      DateTime?  @db.Timestamptz(6)

  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  
  businesses   businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)

  @@index([business_id, is_read])
  @@index([business_id, is_dismissed])
}
`;
  content += notificationsModel;
  console.log('Added notifications model.');
  
  // Add relation to businesses
  const updatedBusinessMatch = content.match(businessModelRegex);
  if (updatedBusinessMatch && !updatedBusinessMatch[0].includes('notifications[]')) {
    const updatedBusinessBlock = updatedBusinessMatch[0].replace(
      'model businesses {',
      'model businesses {\n  notifications            notifications[]'
    );
    content = content.replace(updatedBusinessMatch[0], updatedBusinessBlock);
    console.log('Added notifications relation to businesses model.');
  }
}

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Done.');
