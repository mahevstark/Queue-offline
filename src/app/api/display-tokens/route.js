import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    try {
        const whereClause = branchId ? { branchId: parseInt(branchId) } : {};

        const [currentTokens, nextTokens] = await Promise.all([
            prisma.token.findMany({
                where: { 
                    ...whereClause,
                    status: 'SERVING',
                },
                include: {
                    desk: true,
                    subService: {
                        include: {
                            service: true
                        }
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 5,
            }),
            prisma.token.findMany({
                where: { 
                    ...whereClause,
                    status: 'PENDING',
                },
                include: {
                    desk: true,
                    subService: {
                        include: {
                            service: true
                        }
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
                take: 5,
            })
        ]);

        return NextResponse.json({
            currentTokens,
            nextTokens,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error in display-tokens API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tokens' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;