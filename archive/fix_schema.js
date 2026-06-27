const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add fields to `businesses`
if (!schema.includes('storefront_orders[]')) {
  schema = schema.replace(
    'model businesses {',
    `model businesses {
  storefront_orders         storefront_orders[]
  store_payment_settings    store_payment_settings?
  business_payment_methods  business_payment_methods[]
  stripe_connect_accounts   stripe_connect_accounts?
  storefront_analytics      storefront_analytics[]
  payment_transactions      payment_transactions[]
  business_settings         business_settings?
  feature_flags             feature_flags[]
  product_categories        product_categories[]
  notifications             notifications[]`
  );
}

// 2. Add fields to `products`
if (!schema.includes('stock_status String?')) {
  schema = schema.replace(
    'model products {',
    `model products {
  slug         String?
  stock_status String?
  sales_count  Int?     @default(0)`
  );
}

// 3. Add fields to `restaurant_orders`
if (!schema.includes('tip_amount')) {
  schema = schema.replace(
    'model restaurant_orders {',
    `model restaurant_orders {
  payment_method String?
  payment_status String?
  tip_amount     Decimal? @db.Decimal(12, 2)`
  );
}

// 4. Add fields to `invoices`
if (!schema.includes('invoice_payments[]')) {
  schema = schema.replace(
    'model invoices {',
    `model invoices {
  invoice_payments invoice_payments[]`
  );
}

// 5. Append missing models
const newModels = `
model storefront_orders {
  id                 Int                      @id @default(autoincrement())
  business_id        String                   @db.Uuid
  order_number       String                   @unique
  customer_email     String?
  customer_phone     String?
  customer_name      String?
  shipping_address   String?
  billing_address    String?
  subtotal           Decimal?                 @default(0) @db.Decimal(12, 2)
  tax_amount         Decimal?                 @default(0) @db.Decimal(12, 2)
  shipping_amount    Decimal?                 @default(0) @db.Decimal(12, 2)
  discount_amount    Decimal?                 @default(0) @db.Decimal(12, 2)
  total_amount       Decimal?                 @default(0) @db.Decimal(12, 2)
  currency           String?                  @default("PKR")
  status             String?                  @default("pending")
  payment_status     String?                  @default("pending")
  fulfillment_status String?                  @default("unfulfilled")
  notes              String?
  metadata           Json?
  created_at         DateTime?                @default(now()) @db.Timestamptz(6)
  updated_at         DateTime?                @default(now()) @db.Timestamptz(6)
  businesses         businesses               @relation(fields: [business_id], references: [id], onDelete: Cascade)
  items              storefront_order_items[]
}

model storefront_order_items {
  id           Int                @id @default(autoincrement())
  order_id     Int
  product_id   String?            @db.Uuid
  product_name String?
  quantity     Decimal            @default(1) @db.Decimal(12, 2)
  unit_price   Decimal            @default(0) @db.Decimal(12, 2)
  tax_amount   Decimal?           @default(0) @db.Decimal(12, 2)
  total_price  Decimal?           @default(0) @db.Decimal(12, 2)
  metadata     Json?
  order        storefront_orders  @relation(fields: [order_id], references: [id], onDelete: Cascade)
}

model store_payment_settings {
  id                      String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id             String     @unique @db.Uuid
  allow_cod               Boolean?   @default(true)
  allow_prepaid           Boolean?   @default(true)
  require_cvv             Boolean?   @default(true)
  require_billing_address Boolean?   @default(false)
  allow_save_cards        Boolean?   @default(false)
  auto_capture_payments   Boolean?   @default(true)
  default_currency        String?    @default("PKR")
  cod_instructions        String?
  payment_instructions    String?
  enable_easypaisa        Boolean?   @default(false)
  enable_jazzcash         Boolean?   @default(false)
  enable_bank_transfer    Boolean?   @default(false)
  created_at              DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at              DateTime?  @default(now()) @db.Timestamptz(6)
  businesses              businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
}

model business_payment_methods {
  id                     String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id            String     @db.Uuid
  provider               String
  display_name           String
  description            String?
  icon_url               String?
  is_active              Boolean    @default(false)
  is_test_mode           Boolean?   @default(false)
  is_default             Boolean?   @default(false)
  supports_cod           Boolean?   @default(false)
  supports_cards         Boolean?   @default(false)
  supports_wallet        Boolean?   @default(false)
  supports_bank_transfer Boolean?   @default(false)
  fee_percentage         Decimal?   @default(0) @db.Decimal(5, 2)
  fee_fixed              Decimal?   @default(0) @db.Decimal(12, 2)
  stripe_account_id      String?
  config                 Json?
  sort_order             Int?       @default(0)
  created_at             DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at             DateTime?  @default(now()) @db.Timestamptz(6)
  businesses             businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)

  @@unique([business_id, provider])
}

model stripe_connect_accounts {
  id                    String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id           String     @unique @db.Uuid
  stripe_account_id     String     @unique
  account_type          String     @default("express")
  business_type         String?
  business_profile      Json?
  onboarding_url        String?
  onboarding_expires_at DateTime?  @db.Timestamptz(6)
  is_charges_enabled    Boolean?   @default(false)
  is_payouts_enabled    Boolean?   @default(false)
  is_details_submitted  Boolean?   @default(false)
  default_currency      String?    @default("PKR")
  created_at            DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at            DateTime?  @default(now()) @db.Timestamptz(6)
  businesses            businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
}

model storefront_analytics {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @db.Uuid
  date         DateTime   @db.Date
  orders_count Int        @default(0)
  revenue      Decimal    @default(0) @db.Decimal(12, 2)
  visitors     Int?       @default(0)
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  businesses   businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)

  @@unique([business_id, date])
}

model payment_transactions {
  id                       String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  order_id                 Int
  business_id              String     @db.Uuid
  provider                 String
  stripe_payment_intent_id String?
  amount                   Decimal    @db.Decimal(12, 2)
  currency                 String     @default("PKR")
  status                   String     @default("pending")
  created_at               DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at               DateTime?  @default(now()) @db.Timestamptz(6)
  businesses               businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
}

model business_settings {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @unique @db.Uuid
  settings     Json?
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  businesses   businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
}

model feature_flags {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @db.Uuid
  feature_name String
  is_enabled   Boolean    @default(false)
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  businesses   businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)

  @@unique([business_id, feature_name])
}

model product_categories {
  id          String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id String     @db.Uuid
  name        String
  description String?
  slug        String?
  is_active   Boolean?   @default(true)
  created_at  DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at  DateTime?  @default(now()) @db.Timestamptz(6)
  businesses  businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)

  @@unique([business_id, name])
}

model subscription_plans {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name         String
  price        Decimal    @db.Decimal(10, 2)
  features     Json?
  is_active    Boolean    @default(true)
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
}

model invoice_payments {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  invoice_id   String     @db.Uuid
  amount       Decimal    @db.Decimal(12, 2)
  payment_date DateTime   @db.Date
  method       String?
  reference    String?
  notes        String?
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  invoices     invoices   @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
}

model notifications {
  id           String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id  String     @db.Uuid
  user_id      String?
  title        String
  message      String
  type         String?
  is_read      Boolean    @default(false)
  link         String?
  created_at   DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime?  @default(now()) @db.Timestamptz(6)
  businesses   businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
}
`;

if (!schema.includes('model storefront_orders {')) {
  schema += newModels;
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema fixed!');
