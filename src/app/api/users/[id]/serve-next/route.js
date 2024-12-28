import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emitTokenUpdate } from '@/lib/socketServer';

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const userId = parseInt(id);

        // Get user with desk assignment
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { assignedDesk: true }
        });

        if (!user || !user.assignedDeskId) {
            return NextResponse.json(
                { success: false, error: 'User not found or not assigned to a desk' },
                { status: 404 }
            );
        }

        // Check if user is already serving a token
        const currentToken = await prisma.token.findFirst({
            where: {
                assignedTo: { id: userId },
                status: 'SERVING'
            }
        });

        if (currentToken) {
            return NextResponse.json(
                { success: false, error: 'Already serving a token' },
                { status: 400 }
            );
        }

        // Get next pending token for the desk
        const nextToken = await prisma.token.findFirst({
            where: {
                deskId: user.assignedDeskId,
                status: 'PENDING'
            },
            orderBy: { createdAt: 'asc' },
            include: {
                service: true,
                subService: true
            }
        });

        if (!nextToken) {
            return NextResponse.json(
                { success: false, error: 'No pending tokens available' },
                { status: 404 }
            );
        }

        // Update token status to SERVING
        const updatedToken = await prisma.token.update({
            where: { id: nextToken.id },
            data: {
                status: 'SERVING',
                assignedTo: {
                    connect: { id: userId }
                }
            },
            include: {
                service: true,
                subService: true,
                desk: true,
                assignedTo: true
            }
        });

        // Emit socket update
        await emitTokenUpdate();

        return NextResponse.json({
            success: true,
            data: updatedToken
        });

    } catch (error) {
        console.error('Detailed error in serve-next:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to serve next token',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}