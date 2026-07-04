#!/usr/bin/env node
/**
 * Static wiring checks for Google OAuth + Better Auth mobile-safe callbacks.
 * Run: node scripts/verify-google-oauth.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

let failed = false;
const mark = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const auth = read('lib/auth.js');
const origins = read('lib/auth/authOrigins.js');
const register = read('app/register/page.js');
const login = read('app/login/page.js');
const proxy = read('proxy.ts');
const envExample = read('.env.example');

if (!auth.includes('trustedOrigins')) {
  mark('lib/auth.js must configure trustedOrigins');
}
if (!auth.includes('redirectURI')) {
  mark('lib/auth.js must pin google.redirectURI to canonical callback');
}
if (!origins.includes('resolveCanonicalHostRedirect')) {
  mark('authOrigins must export canonical host redirect helper');
}
if (!origins.includes('resolveAuthTrustedOrigins')) {
  mark('authOrigins must export trusted origins resolver');
}
if (register.includes('window.location.origin}/register')) {
  mark('register Google callback must use relative /register path, not absolute origin URL');
}
if (!register.includes("callbackURL: '/register'")) {
  mark('register must pass relative callbackURL for Better Auth origin check');
}
if (login.includes('window.location.origin}/login')) {
  mark('login Google callback must use relative /login path');
}
if (!login.includes("callbackURL: '/login'")) {
  mark('login must pass relative callbackURL');
}
if (!proxy.includes('resolveCanonicalHostRedirect')) {
  mark('proxy must redirect apex host to canonical www in production');
}
if (!envExample.includes('api/auth/callback/google')) {
  mark('.env.example must document Google redirect URI');
}

if (failed) {
  console.error('verify-google-oauth: failures above');
  process.exit(1);
}
console.log('verify-google-oauth: OK');
