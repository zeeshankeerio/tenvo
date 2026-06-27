'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
  getDomainKnowledgeForBusiness,
  resolveFormDefaultTaxRate,
} from '@/lib/utils/businessRegionalContext';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';

/**
 * Shared regional + domain context for hub forms.
 * Currency, tax, and phone defaults come from the business registration country pack, * never mix PK/UAE/US standards in one workspace.
 */
export function useFormRegionalContext(category) {
  const ctx = useBusiness();
  const { business, currency, currencySymbol, regionalPack, regionalStandards } = ctx;

  const countryIso = regionalPack?.countryIso || regionalStandards?.countryCode || 'PK';
  const registry = regionalStandards || getRegionalStandards(countryIso);
  const domainCategory = category || business?.category || 'retail-shop';

  const domainKnowledge = useMemo(
    () => getDomainKnowledgeForBusiness(domainCategory, business),
    [domainCategory, business]
  );

  const defaultTaxRate = useMemo(
    () => resolveFormDefaultTaxRate(business, domainCategory),
    [business, domainCategory]
  );

  return {
    ...ctx,
    countryIso,
    registry,
    domainCategory,
    domainKnowledge,
    defaultTaxRate,
    taxLabel: regionalPack?.taxLabel || registry.taxLabel || 'Tax',
    taxIdLabel: regionalPack?.taxIdLabel || registry.taxIdLabel || 'Tax ID',
    isPakistanMarket: countryIso === 'PK',
    currency: currency || regionalPack?.currency || registry.currency,
    currencySymbol: currencySymbol || regionalPack?.currencySymbol || registry.currencySymbol,
  };
}

export default useFormRegionalContext;
