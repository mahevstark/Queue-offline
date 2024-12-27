import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id } = params;
        const userId = parseInt(id);

        // Get the user with their desk assignment
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { assignedDesk: true }
        });

        if (!user || !user.assignedDeskId) {
            return NextResponse.json(
                { error: 'User not found or not assigned to a desk' },
                { status: 404 }
            );
        }

        // Get current and next tokens
        const [currentToken, nextToken, completedCount, queueCount] = await Promise.all([
            // Current token being served
            prisma.token.findFirst({
                where: {
                    assignedToId: userId,
                    status: 'SERVING',
                },
                include: {
                    service: true,
                    subService: true,
                    desk: true,
                },
            }),
            // Next token in queue for the desk
            prisma.token.findFirst({
                where: {
                    deskId: user.assignedDeskId,
                    status: 'PENDING',
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    service: true,
                    subService: true,
                },
            }),
            // Count of completed tokens today
            prisma.token.count({
                where: {
                    assignedToId: userId,
                    status: 'COMPLETED',
                    updatedAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            // Count of pending tokens in queue
            prisma.token.count({
                where: {
                    deskId: user.assignedDeskId,
                    status: 'PENDING',
                },
            }),
        ]);

        return NextResponse.json({
            currentToken,
            nextToken,
            stats: {
                tokensCompleted: completedCount,
                tokensInQueue: queueCount,
            },
        });

    } catch (error) {
        console.error('Error fetching user tokens:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tokens' },
            { status: 500 }
        );
    }
}