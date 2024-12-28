import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const userId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!userId || isNaN(userId)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid user ID' 
            }, { status: 400 });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const completedTokens = await prisma.token.count({
            where: {
                assignedToId: userId,
                status: 'COMPLETED',
                updatedAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        return NextResponse.json({
            success: true,
            count: completedTokens
        });

    } catch (error) {
        console.error('Error fetching completed tokens:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch completed tokens' 
        }, { status: 500 });
    }
}