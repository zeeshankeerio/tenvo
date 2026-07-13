import { NextResponse } from 'next/server';
import { getNextEmployeeCodeAction } from '@/lib/actions/standard/payroll';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json(
                { error: 'Business ID is required' },
                { status: 400 }
            );
        }

        const result = await getNextEmployeeCodeAction(businessId);
        
        if (result.success) {
            return NextResponse.json({ code: result.code });
        } else {
            return NextResponse.json(
                { error: result.error || 'Failed to generate code' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Next employee code API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
