/**
 * Fetch Roll Inn (eatx.pk) public menu for seed catalog generation.
 * Run: node scripts/fetch-rollinn-menu.mjs
 */
import fs from 'fs';
import path from 'path';

const API = 'https://services.eatx.pk/';
const COMPANY_ID = '1155';
const IMAGE_BASE = API;

function rollInnWebCredentials(companyId = Number(COMPANY_ID)) {
  const token = `${(companyId + 7) * 3 - 10}_w@p`;
  return { username: token, password: token };
}

async function login() {
  const { username, password } = rollInnWebCredentials();
  const res = await fetch(`${API}UserLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username, Password: password }),
  });
  if (!res.ok) throw new Error(`Login HTTP ${res.status}`);
  const json = await res.json();
  const jwt = json?.DataSet?.Table1?.[0]?.JWT;
  if (!jwt) throw new Error('Login succeeded but JWT missing');
  return jwt;
}

async function fetchMenu(token, operationId = 2, areaId = null, branchId = null) {
  const res = await fetch(`${API}GetWebOrderAddress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      OperationId: operationId,
      CompanyId: COMPANY_ID,
      IsMobile: false,
      IsWeb: true,
      AreaId: areaId,
      BranchId: branchId,
    }),
  });
  if (!res.ok) throw new Error(`Menu HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const token = await login();
const data = await fetchMenu(token);
const ds = data?.DataSet || {};
const menuItems = ds.Table || [];
const menuVariants = ds.Table2 || [];
const pricing = ds.Table13 || [];

const outPath = path.resolve(import.meta.dirname, '../lib/dataLab/rollinnArchiveExtract.json');
const extract = {
  source: 'https://rollinnbbq.pk/',
  brand: 'Roll Inn',
  api: API,
  companyId: COMPANY_ID,
  imageBase: IMAGE_BASE,
  menuItems,
  menuVariants,
  pricing,
  branchDetails: ds.Table11?.[0] || null,
};

fs.writeFileSync(outPath, JSON.stringify(extract, null, 2));

console.log(`Wrote ${outPath}`);
console.log('menuItems', menuItems.length);
console.log('menuVariants', menuVariants.length);
if (menuItems[0]) console.log('sample', menuItems[0].ProductName, menuItems[0].Price);
