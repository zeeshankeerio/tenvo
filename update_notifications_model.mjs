import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const regex = /model\s+notifications\s+\{[\s\S]*?\}/;
const replacement = `model notifications {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @db.Uuid
  user_id      String?
  title        String
  message      String
  type         String?
  is_read      Boolean    @default(false)
  link         String?
  
  // Newly added columns for full enterprise support
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
}`;

content = content.replace(regex, replacement);

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Replaced notifications model in schema.prisma');
