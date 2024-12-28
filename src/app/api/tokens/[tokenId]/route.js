import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getIO } from '@/lib/socketServer';

export async function POST(request, { params }) {
    try {
        const { tokenId } = params;

        const updatedToken = await prisma.token.update({
            where: { id: parseInt(tokenId) },
            data: { status: 'SERVING' },
            include: {
                desk: true,
                service: true,
                subService: true,
                assignedTo: true
            }
        });

        // Emit socket event for real-time updates
        const io = getIO();
        await emitTokenUpdate();

        return NextResponse.json({
            data: updatedToken,
            success: true
        });
    } catch (error) {
        console.error('Error serving token:', error);
        return NextResponse.json(
            { error: 'Failed to serve token' },
            { status: 500 }
        );
    }
}