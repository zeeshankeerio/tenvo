/**
 * Static wiring checks for hub campaigns & marketing workspace.
 * Run: node scripts/verify-campaigns-hub.mjs
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

const hub = read('lib/actions/standard/campaignsHub.js');
const service = read('lib/services/MarketingAgentService.js');
const manager = read('components/crm/CampaignsManager.jsx');
const integrationsPanel = read('components/crm/CampaignIntegrationsPanel.jsx');
const integrations = read('lib/marketing/campaignIntegrations.js');
const caps = read('lib/marketing/campaignCapabilities.js');
const island = read('components/premium/SegmentationIntelligenceIsland.jsx');
const cronRoute = read('app/api/internal/campaigns/dispatch-scheduled/route.js');

if (!hub.includes('crm.view_campaigns')) mark('campaignsHub must guard with crm.view_campaigns');
if (!hub.includes('business_id = $1')) mark('campaignsHub queries must filter by business_id');
if (!hub.includes('dispatchOutreachCampaignAction')) mark('campaignsHub must export dispatchOutreachCampaignAction');
if (!hub.includes('createCustomSegmentAction')) mark('campaignsHub must export createCustomSegmentAction');
if (!hub.includes('getCampaignIntegrationsAction')) mark('campaignsHub must export getCampaignIntegrationsAction');
if (!hub.includes('updateCampaignIntegrationsAction')) mark('campaignsHub must export updateCampaignIntegrationsAction');
if (!hub.includes('deleteSegmentAction')) mark('campaignsHub must export deleteSegmentAction');
if (!hub.includes('deleteCampaignAction')) mark('campaignsHub must export deleteCampaignAction');
if (!hub.includes('getSegmentIntelligenceAction')) mark('campaignsHub must export getSegmentIntelligenceAction');

if (!service.includes('storefront_orders')) mark('MarketingAgentService segments must include storefront_orders');
if (!service.includes('dispatchCampaignMessages')) mark('MarketingAgentService must implement dispatchCampaignMessages');
if (!service.includes('AND business_id = $2')) mark('queueCampaignMessages must scope campaign by business_id');
if (!service.includes('deleteSegment')) mark('MarketingAgentService must implement deleteSegment');
if (!service.includes('deleteCampaign')) mark('MarketingAgentService must implement deleteCampaign');
if (!service.includes('validateSegmentForOutreach')) mark('MarketingAgentService must validate segments before outreach');
if (!service.includes('resolveCampaignEmailConfig')) mark('MarketingAgentService must resolve tenant email config');
if (!service.includes('processDueScheduledCampaigns')) mark('MarketingAgentService must process scheduled campaigns');

if (!manager.includes('CampaignsManager')) mark('CampaignsManager component missing');
if (!manager.includes('dispatchOutreachCampaignAction')) mark('CampaignsManager must wire dispatch action');
if (!manager.includes('CampaignIntegrationsPanel')) mark('CampaignsManager must include integrations panel');
if (!manager.includes('deleteSegmentAction')) mark('CampaignsManager must wire delete segment');
if (!manager.includes('getCampaignWorkspaceNotice')) mark('CampaignsManager must show honest capability notice');
if (manager.includes("return ', '")) mark('CampaignsManager must not use corrupted ", " placeholders');

if (!integrationsPanel.includes('testCampaignEmailConnectionAction')) {
  mark('CampaignIntegrationsPanel must wire test connection');
}
if (!integrationsPanel.includes('••••')) mark('CampaignIntegrationsPanel must reference masked secret pattern');

if (!integrations.includes('settings.campaigns.integrations') && !integrations.includes('campaigns:')) {
  mark('campaignIntegrations must merge into businesses.settings.campaigns');
}
if (!integrations.includes('mergeCampaignIntegrationsIntoSettings')) {
  mark('campaignIntegrations must export mergeCampaignIntegrationsIntoSettings');
}
if (!integrations.includes('resolveCampaignEmailConfig')) {
  mark('campaignIntegrations must export resolveCampaignEmailConfig');
}

if (!caps.includes('roadmap')) mark('campaignCapabilities must label WhatsApp as roadmap');
if (!caps.includes('getEmailCampaignDeliveryStatusForOwner')) {
  mark('campaignCapabilities must support owner email delivery status');
}

if (island.includes('const SEGMENTS = [')) mark('SegmentationIntelligenceIsland must not use mock SEGMENTS');
if (!island.includes('getSegmentIntelligenceAction')) {
  mark('SegmentationIntelligenceIsland must load live segment data');
}

if (!cronRoute.includes('processDueScheduledCampaigns')) {
  mark('dispatch-scheduled route must call processDueScheduledCampaigns');
}

const schema = read('prisma/schema.prisma');
for (const model of ['campaigns', 'campaign_messages', 'customer_segments', 'segment_customers', 'promotions']) {
  if (!schema.includes(`model ${model}`)) mark(`prisma schema missing model ${model}`);
}

if (failed) {
  process.exit(1);
}

console.log('OK: campaigns hub wiring checks passed');
