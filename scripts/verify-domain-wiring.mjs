/**
 * Sanity-check: every domainKnowledge key has a getDomainConfig row and icon.
 * Run: node scripts/verify-domain-wiring.mjs
 */
import { domainKnowledge, DOMAIN_KNOWLEDGE_KEYS } from '../lib/domainKnowledge.js';
import { getDomainConfig, suggestPlanTier } from '../lib/config/domains.js';

let failed = false;
for (const key of DOMAIN_KNOWLEDGE_KEYS) {
  const cfg = getDomainConfig(key);
  if (!cfg || !cfg.required_modules?.length) {
    console.error(`FAIL: getDomainConfig("${key}")`);
    failed = true;
    continue;
  }
  const dk = domainKnowledge[key];
  if (!dk?.icon) {
    console.error(`FAIL: missing icon on domainKnowledge["${key}"]`);
    failed = true;
  }
  const tier = suggestPlanTier(key);
  if (!['free', 'starter', 'business'].includes(tier)) {
    console.error(`FAIL: suggestPlanTier("${key}") -> ${tier}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`OK: ${DOMAIN_KNOWLEDGE_KEYS.length} domains wired (config + plan tier + icons).`);
