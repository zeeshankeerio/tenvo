import { describe, it, expect } from 'vitest';
import {
  buildStoreContactPayload,
  flattenStoreContactForForm,
} from '../storeContactPayload.js';
import { getStoreSetupStatus } from '../storeSetupStatus.js';

describe('storeContactPayload', () => {
  it('builds published contact from hub form fields', () => {
    const payload = buildStoreContactPayload({
      publicEmail: 'shop@acme.com',
      phone: '+92 300 5551234',
      city: 'Karachi',
      country: 'Pakistan',
    });
    expect(payload.email).toBe('shop@acme.com');
    expect(payload.phone).toBe('+92 300 5551234');
    expect(payload.published).toBe(true);
    expect(payload.updatedAt).toBeTruthy();
  });

  it('flattens settings.contact over business columns', () => {
    const flat = flattenStoreContactForForm({
      business: { phone: 'legacy', city: 'Lahore', country: 'Pakistan' },
      storeSettings: {
        contact: { email: 'support@shop.com', phone: '+92 301 1112222' },
        businessHours: '9-5',
      },
    });
    expect(flat.publicEmail).toBe('support@shop.com');
    expect(flat.phone).toBe('+92 301 1112222');
    expect(flat.businessHours).toBe('9-5');
  });
});

describe('storeSetupStatus', () => {
  it('marks launch ready when required checks pass', () => {
    const status = getStoreSetupStatus({
      enabled: true,
      storeDomain: 'my-shop',
      description: 'We sell widgets',
      phone: '+92 300 5551234',
      products: { active: 3 },
    });
    expect(status.readyToLaunch).toBe(true);
    expect(status.requiredDone).toBe(status.requiredTotal);
  });
});
