import fs from 'fs';

const filePath = 'lib/services/notifications.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace property `read: false` with `is_read: false`
content = content.replace(/read:\s*false/g, 'is_read: false');

// Replace property `read: true` with `is_read: true`
content = content.replace(/read:\s*true/g, 'is_read: true');

// Replace column name in Supabase query `.eq('read', false)` with `.eq('is_read', false)`
content = content.replace(/\.eq\('read',\s*false\)/g, ".eq('is_read', false)");

// Replace column name in Supabase query `.eq('read', true)` with `.eq('is_read', true)`
content = content.replace(/\.eq\('read',\s*true\)/g, ".eq('is_read', true)");

fs.writeFileSync(filePath, content);
console.log('Successfully updated notifications.js');
