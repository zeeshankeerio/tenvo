const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!/model\s+notifications\s+\{/.test(schema)) {
  schema += `\n
model notifications {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  business_id  String    @db.Uuid
  user_id      String
  type         String
  title        String
  message      String
  priority     String    @default("medium")
  action_url   String?
  metadata     Json?     @default("{}")
  is_read      Boolean   @default(false)
  is_dismissed Boolean   @default(false)
  read_at      DateTime? @db.Timestamptz(6)
  created_at   DateTime  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime  @default(now()) @updatedAt @db.Timestamptz(6)

  business     businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, business_id])
  @@index([business_id, type])
  @@index([user_id, business_id, is_read])
}
`;

  // Also we need to add the opposite relation to User and businesses
  // businesses has many notifications
  schema = schema.replace(
    /model businesses\s*\{/,
    'model businesses {\n  notifications            notifications[]'
  );

  schema = schema.replace(
    /model User\s*\{/,
    'model User {\n  notifications            notifications[]'
  );

  fs.writeFileSync(schemaPath, schema);
  console.log('Appended notifications model to schema.prisma');
} else {
  console.log('notifications model already exists in schema.prisma');
}
