import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketName = 'products';
  const exists = buckets.some((b) => b.name === bucketName);

  if (!exists) {
    console.log(`Bucket '${bucketName}' does not exist. Creating...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (error) {
      console.error('Error creating bucket:', error);
    } else {
      console.log('Bucket created successfully!');
    }
  } else {
    console.log(`Bucket '${bucketName}' already exists.`);
    
    // Ensure it's public
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (error) {
      console.error('Error updating bucket:', error);
    } else {
      console.log('Bucket updated successfully to ensure it is public!');
    }
  }
}

main();
