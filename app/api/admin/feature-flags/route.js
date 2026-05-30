import { NextResponse } from 'next/server';
import { requirePlatformAccess } from '@/lib/actions/admin/platform';
import pool from '@/lib/db';

/**
 * GET /api/admin/feature-flags
 * List all feature flags with usage statistics
 */
export async function GET(request) {
  try {
    await requirePlatformAccess();
    
    const client = await pool.connect();
    
    try {
      const flagsResult = await client.query(`
        SELECT 
          f.*,
          COUNT(DISTINCT fo.id) as override_count,
          COUNT(DISTINCT CASE WHEN fo.target_type = 'business' THEN fo.id END) as business_overrides,
          COUNT(DISTINCT CASE WHEN fo.target_type = 'user' THEN fo.id END) as user_overrides
        FROM platform_feature_flags f
        LEFT JOIN platform_feature_flag_overrides fo ON f.id = fo.platform_feature_flag_id AND (fo.expires_at IS NULL OR fo.expires_at > NOW())
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `);
      
      // Serialize dates to strings to prevent React error #31
      const serializedFlags = flagsResult.rows.map(flag => ({
        ...flag,
        created_at: flag.created_at ? new Date(flag.created_at).toISOString() : null,
        updated_at: flag.updated_at ? new Date(flag.updated_at).toISOString() : null
      }));
      
      return NextResponse.json({
        success: true,
        flags: serializedFlags
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error fetching feature flags:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
export async function POST(request) {
  try {
    await requirePlatformAccess();
    
    const body = await request.json();
    const { key, name, description, type, default_value, rollout_percentage } = body;
    
    if (!key || !name) {
      return NextResponse.json(
        { success: false, error: 'Key and name are required' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO platform_feature_flags (key, name, description, type, default_value, rollout_percentage)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [key, name, description, type || 'boolean', JSON.stringify(default_value) || 'false', rollout_percentage || 100]);
      
      // Serialize dates to strings
      const flag = result.rows[0];
      const serializedFlag = {
        ...flag,
        created_at: flag.created_at ? new Date(flag.created_at).toISOString() : null,
        updated_at: flag.updated_at ? new Date(flag.updated_at).toISOString() : null
      };
      
      return NextResponse.json({
        success: true,
        flag: serializedFlag
      });
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { success: false, error: 'Feature flag with this key already exists' },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error creating feature flag:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
