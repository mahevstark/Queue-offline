import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
    try {
        const { tokenId } = params;
        const startedAt = new Date();

        const token = await prisma.token.update({
            where: { id: parseInt(tokenId) },
            data: {
                startedAt: startedAt,
                waitingTime: Math.round((startedAt.getTime() - new Date(token.createdAt).getTime()) / (1000 * 60)) // Calculate waiting time in minutes
            }
        });

        return NextResponse.json({
            success: true,
            data: token
        });
    } catch (error) {
        console.error('Error starting token service:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to start token service',
            details: error.message
        }, { status: 500 });
    }
}