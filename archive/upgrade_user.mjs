import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'zeeshan.keerio@mindscapeanalytics.com';
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }
  
  console.log(`Found user: ${user.id}`);
  
  // Update role to owner in User table just in case
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'owner' }
  });
  
  // Find businesses for this user
  const businessUsers = await prisma.business_users.findMany({
    where: { user_id: user.id }
  });
  
  for (const bu of businessUsers) {
    console.log(`Updating business_user role to 'owner' for business ${bu.business_id}`);
    await prisma.business_users.update({
      where: { id: bu.id },
      data: { 
        role: 'owner',
        permissions: {
          all: true,
          admin: true,
          inventory: true,
          sales: true,
          purchases: true,
          finance: true,
          manufacturing: true,
          storefront: true
        }
      }
    });
    
    console.log(`Upgrading business ${bu.business_id} to enterprise plan`);
    await prisma.businesses.update({
      where: { id: bu.business_id },
      data: { 
        plan_tier: 'enterprise',
        max_products: 999999,
        max_warehouses: 999999,
        plan_seats: 999999
      }
    });
    
    // Also enable storefront and all features in business_settings
    const settings = await prisma.business_settings.findUnique({
      where: { business_id: bu.business_id }
    });
    
    if (settings) {
      const updatedSettings = {
        ...(typeof settings.settings === 'object' && settings.settings ? settings.settings : {}),
        storefront: {
          enabled: true,
          theme: 'modern'
        },
        features: {
          inventory: true,
          pos: true,
          manufacturing: true,
          accounting: true,
          ecommerce: true,
          loyalty: true
        }
      };
      
      await prisma.business_settings.update({
        where: { id: settings.id },
        data: { settings: updatedSettings }
      });
    } else {
      await prisma.business_settings.create({
        data: {
          business_id: bu.business_id,
          settings: {
            storefront: {
              enabled: true,
              theme: 'modern'
            },
            features: {
              inventory: true,
              pos: true,
              manufacturing: true,
              accounting: true,
              ecommerce: true,
              loyalty: true
            }
          }
        }
      });
    }
  }
  
  console.log('Successfully upgraded user and associated businesses!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
