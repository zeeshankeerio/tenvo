'use server';

/**
 * Feature Flag Management Server Actions
 * Complete CRUD for feature flags and overrides
 */

import pool from '@/lib/db';
import { requirePlatformAccess } from './platform';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { planHasFeature } from '@/lib/config/plans';
import { parsePlatformOverrideValue } from '@/lib/subscription/platformFeatureOverrides';

// ============================================
// FEATURE FLAG MANAGEMENT
// ============================================

/**
 * List all feature flags with override counts
 */
export async function listFeatureFlags() {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                f.*,
                COUNT(DISTINCT fo.id) as override_count,
                COUNT(DISTINCT CASE WHEN fo.target_type = 'business' THEN fo.id END) as business_overrides,
                COUNT(DISTINCT CASE WHEN fo.target_type = 'user' THEN fo.id END) as user_overrides
            FROM platform_feature_flags f
            LEFT JOIN platform_feature_flag_overrides fo ON f.id = fo.platform_feature_flag_id 
                AND (fo.expires_at IS NULL OR fo.expires_at > NOW())
            GROUP BY f.id
            ORDER BY f.created_at DESC
        `);
        
        return actionSuccess({ flags: result.rows });
    } catch (error) {
        console.error('[Admin] listFeatureFlags error:', error);
        const msg = error?.message || String(error);
        if (msg.includes('platform_feature_flags') && (msg.includes('does not exist') || error?.code === '42P01')) {
            return actionFailure(
                'MIGRATION_REQUIRED',
                'Platform feature flag tables are missing. Run database migrations (e.g. npm run db:migrate) so platform_feature_flags exists.'
            );
        }
        return actionFailure('LIST_FEATURE_FLAGS_FAILED', msg);
    } finally {
        client.release();
    }
}

/**
 * Get single feature flag with overrides
 */
export async function getFeatureFlag(flagId) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const flagResult = await client.query(
            'SELECT * FROM platform_feature_flags WHERE id = $1',
            [flagId]
        );
        
        if (flagResult.rows.length === 0) {
            return actionFailure('NOT_FOUND', 'Feature flag not found');
        }
        
        const overridesResult = await client.query(`
            SELECT 
                fo.*,
                CASE 
                    WHEN fo.target_type = 'business' THEN b.business_name
                    WHEN fo.target_type = 'user' THEN u.name
                END as target_name,
                CASE 
                    WHEN fo.target_type = 'business' THEN b.email
                    WHEN fo.target_type = 'user' THEN u.email
                END as target_email
            FROM platform_feature_flag_overrides fo
            LEFT JOIN businesses b ON fo.target_type = 'business' AND fo.target_id = b.id
            LEFT JOIN "user" u ON fo.target_type = 'user' AND fo.target_id = u.id
            WHERE fo.platform_feature_flag_id = $1
            ORDER BY fo.created_at DESC
        `, [flagId]);
        
        return actionSuccess({
            flag: flagResult.rows[0],
            overrides: overridesResult.rows
        });
    } catch (error) {
        console.error('[Admin] getFeatureFlag error:', error);
        return actionFailure('GET_FEATURE_FLAG_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Create new feature flag
 */
export async function createFeatureFlag({
    key,
    name,
    description,
    type = 'boolean',
    default_value = false,
    rollout_percentage = 100
}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            INSERT INTO platform_feature_flags (key, name, description, type, default_value, rollout_percentage)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [key, name, description, type, JSON.stringify(default_value), rollout_percentage]);
        
        return actionSuccess({ flag: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return actionFailure('DUPLICATE_KEY', 'Feature flag with this key already exists');
        }
        console.error('[Admin] createFeatureFlag error:', error);
        return actionFailure('CREATE_FEATURE_FLAG_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Update feature flag
 */
export async function updateFeatureFlag(flagId, updates) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const setClause = [];
        const values = [];
        let paramCount = 1;
        
        if (updates.name !== undefined) {
            setClause.push(`name = $${paramCount++}`);
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            setClause.push(`description = $${paramCount++}`);
            values.push(updates.description);
        }
        if (updates.default_value !== undefined) {
            setClause.push(`default_value = $${paramCount++}`);
            values.push(JSON.stringify(updates.default_value));
        }
        if (updates.rollout_percentage !== undefined) {
            setClause.push(`rollout_percentage = $${paramCount++}`);
            values.push(updates.rollout_percentage);
        }
        if (updates.is_active !== undefined) {
            setClause.push(`is_active = $${paramCount++}`);
            values.push(updates.is_active);
        }
        
        if (setClause.length === 0) {
            return actionFailure('NO_UPDATES', 'No fields to update');
        }
        
        values.push(flagId);
        
        const result = await client.query(`
            UPDATE platform_feature_flags 
            SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
            return actionFailure('NOT_FOUND', 'Feature flag not found');
        }
        
        return actionSuccess({ flag: result.rows[0] });
    } catch (error) {
        console.error('[Admin] updateFeatureFlag error:', error);
        return actionFailure('UPDATE_FEATURE_FLAG_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Delete feature flag
 */
export async function deleteFeatureFlag(flagId) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        // Check if flag exists
        const checkResult = await client.query(
            'SELECT id FROM platform_feature_flags WHERE id = $1',
            [flagId]
        );
        
        if (checkResult.rows.length === 0) {
            return actionFailure('NOT_FOUND', 'Feature flag not found');
        }
        
        // Delete (cascade will delete overrides)
        await client.query('DELETE FROM platform_feature_flags WHERE id = $1', [flagId]);
        
        return actionSuccess({ message: 'Feature flag deleted' });
    } catch (error) {
        console.error('[Admin] deleteFeatureFlag error:', error);
        return actionFailure('DELETE_FEATURE_FLAG_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// FEATURE FLAG OVERRIDES
// ============================================

/**
 * Create override for business or user
 */
export async function createFeatureFlagOverride({
    feature_flag_id,
    target_type,
    target_id,
    value,
    expires_at,
    reason
}) {
    const session = await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            INSERT INTO platform_feature_flag_overrides 
            (platform_feature_flag_id, target_type, target_id, value, expires_at, reason, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (platform_feature_flag_id, target_type, target_id) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                expires_at = EXCLUDED.expires_at,
                reason = EXCLUDED.reason,
                created_by = EXCLUDED.created_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [feature_flag_id, target_type, target_id, JSON.stringify(value), expires_at, reason, session.user.id]);
        
        return actionSuccess({ override: result.rows[0] });
    } catch (error) {
        console.error('[Admin] createFeatureFlagOverride error:', error);
        return actionFailure('CREATE_OVERRIDE_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Delete override
 */
export async function deleteFeatureFlagOverride(overrideId) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        await client.query(
            'DELETE FROM platform_feature_flag_overrides WHERE id = $1',
            [overrideId]
        );
        
        return actionSuccess({ message: 'Override deleted' });
    } catch (error) {
        console.error('[Admin] deleteFeatureFlagOverride error:', error);
        return actionFailure('DELETE_OVERRIDE_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// FEATURE CHECKING (For client-side use)
// ============================================

/**
 * Check if feature is enabled for a business
 * Used by middleware and guards
 */
export async function checkFeatureForBusiness(featureKey, businessId) {
    const client = await pool.connect();
    
    try {
        // Check for business override
        const overrideResult = await client.query(`
            SELECT f.key, fo.value, fo.expires_at
            FROM platform_feature_flag_overrides fo
            INNER JOIN platform_feature_flags f ON f.id = fo.platform_feature_flag_id
            WHERE f.key = $1
            AND fo.target_type = 'business'
            AND fo.target_id = $2
            AND (fo.expires_at IS NULL OR fo.expires_at > NOW())
        `, [featureKey, businessId]);
        
        if (overrideResult.rows.length > 0) {
            return actionSuccess({ enabled: parsePlatformOverrideValue(overrideResult.rows[0].value) });
        }
        
        // Return default value
        const flagResult = await client.query(
            'SELECT default_value, rollout_percentage FROM platform_feature_flags WHERE key = $1',
            [featureKey]
        );
        
        if (flagResult.rows.length === 0) {
            return actionSuccess({ enabled: false });
        }
        
        const flag = flagResult.rows[0];
        
        // Check rollout percentage
        if (flag.rollout_percentage < 100) {
            // Hash business ID to determine if in rollout group
            const hash = businessId.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            const inRollout = (Math.abs(hash) % 100) < flag.rollout_percentage;
            return actionSuccess({ enabled: inRollout ? flag.default_value : false });
        }
        
        return actionSuccess({ enabled: flag.default_value });
    } catch (error) {
        console.error('[Admin] checkFeatureForBusiness error:', error);
        return actionFailure('CHECK_FEATURE_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Get all enabled features for a business
 */
export async function getEnabledFeaturesForBusiness(businessId, planTier) {
    const client = await pool.connect();
    
    try {
        // Get all active flags
        const flagsResult = await client.query(`
            SELECT f.key, f.default_value, f.rollout_percentage
            FROM platform_feature_flags f
            WHERE f.is_active = true
        `);
        
        const features = {};
        
        for (const flag of flagsResult.rows) {
            // Check for business override
            const overrideResult = await client.query(`
                SELECT value
                FROM platform_feature_flag_overrides
                WHERE platform_feature_flag_id = (SELECT id FROM platform_feature_flags WHERE key = $1)
                AND target_type = 'business'
                AND target_id = $2
                AND (expires_at IS NULL OR expires_at > NOW())
            `, [flag.key, businessId]);
            
            if (overrideResult.rows.length > 0) {
                features[flag.key] = overrideResult.rows[0].value;
            } else {
                // Check rollout and default
                if (flag.rollout_percentage < 100) {
                    const hash = businessId.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                    }, 0);
                    features[flag.key] = (Math.abs(hash) % 100) < flag.rollout_percentage 
                        ? flag.default_value 
                        : false;
                } else {
                    features[flag.key] = flag.default_value;
                }
            }
        }
        
        // Merge with plan features
        const planFeatures = Object.keys(planHasFeature('free', 'invoicing') ? {} : {}); // Get all feature keys
        
        return actionSuccess({ features });
    } catch (error) {
        console.error('[Admin] getEnabledFeaturesForBusiness error:', error);
        return actionFailure('GET_FEATURES_FAILED', error.message);
    } finally {
        client.release();
    }
}
