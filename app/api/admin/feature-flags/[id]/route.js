import { NextResponse } from 'next/server';
import { requirePlatformAccess } from '@/lib/actions/admin/platform';
import pool from '@/lib/db';

/**
 * GET /api/admin/feature-flags/:id
 * Get single feature flag with overrides
 */
export async function GET(request, { params }) {
  try {
    await requirePlatformAccess();
    const { id } = params;
    
    const client = await pool.connect();
    
    try {
      const flagResult = await client.query(
        'SELECT * FROM platform_feature_flags WHERE id = $1',
        [id]
      );
      
      if (flagResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Feature flag not found' },
          { status: 404 }
        );
      }
      
      const overridesResult = await client.query(`
        SELECT 
          fo.*,
          CASE 
            WHEN fo.target_type = 'business' THEN b.business_name
            WHEN fo.target_type = 'user' THEN u.name
          END as target_name
        FROM platform_feature_flag_overrides fo
        LEFT JOIN businesses b ON fo.target_type = 'business' AND fo.target_id = b.id
        LEFT JOIN "user" u ON fo.target_type = 'user' AND fo.target_id = u.id
        WHERE fo.platform_feature_flag_id = $1
        ORDER BY fo.created_at DESC
      `, [id]);
      
      return NextResponse.json({
        success: true,
        flag: flagResult.rows[0],
        overrides: overridesResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error fetching feature flag:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * PUT /api/admin/feature-flags/:id
 * Update feature flag
 */
export async function PUT(request, { params }) {
  try {
    await requirePlatformAccess();
    const { id } = params;
    const body = await request.json();
    
    const client = await pool.connect();
    
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (body.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(body.name);
      }
      if (body.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(body.description);
      }
      if (body.default_value !== undefined) {
        updates.push(`default_value = $${paramCount++}`);
        values.push(JSON.stringify(body.default_value));
      }
      if (body.rollout_percentage !== undefined) {
        updates.push(`rollout_percentage = $${paramCount++}`);
        values.push(body.rollout_percentage);
      }
      if (body.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(body.is_active);
      }
      
      if (updates.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No fields to update' },
          { status: 400 }
        );
      }
      
      values.push(id);
      
      const result = await client.query(`
        UPDATE platform_feature_flags 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Feature flag not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        flag: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error updating feature flag:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/admin/feature-flags/:id
 * Delete feature flag
 */
export async function DELETE(request, { params }) {
  try {
    await requirePlatformAccess();
    const { id } = params;
    
    const client = await pool.connect();
    
    try {
      // Check if flag exists
      const checkResult = await client.query(
        'SELECT id FROM platform_feature_flags WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Feature flag not found' },
          { status: 404 }
        );
      }
      
      // Delete flag (cascade will delete overrides)
      await client.query('DELETE FROM platform_feature_flags WHERE id = $1', [id]);
      
      return NextResponse.json({
        success: true,
        message: 'Feature flag deleted'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error deleting feature flag:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
