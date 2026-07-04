'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { resolvePosSettings } from '@/lib/config/posSettings';

/**
 * Tenant POS preferences from business.settings.pos
 */
export function usePosSettings() {
    const { business } = useBusiness();
    return useMemo(() => resolvePosSettings(business), [business]);
}
