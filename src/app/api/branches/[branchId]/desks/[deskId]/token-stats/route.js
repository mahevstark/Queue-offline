import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { deskId } = params;

        // Get queue count
        const queueCount = await prisma.token.count({
            where: {
                deskId: parseInt(deskId),
                status: 'PENDING'
            }
        });

        // Get completed count for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const completedCount = await prisma.token.count({
            where: {
                deskId: parseInt(deskId),
                status: 'COMPLETED',
                updatedAt: {
                    gte: today
                }
            }
        });

        // Get next token in queue
        const nextToken = await prisma.token.findFirst({
            where: {
                deskId: parseInt(deskId),
                status: 'PENDING'
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json({
            data: {
                queueCount,
                completedCount,
                nextToken
            }
        });

    } catch (error) {
        console.error('Error fetching token stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token stats' },
            { status: 500 }
        );
    }
}