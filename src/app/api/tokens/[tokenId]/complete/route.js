import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
    try {
        const { tokenId } = params;
        const { userId, deskId } = await request.json();

        // Validate input
        if (!tokenId || !userId || !deskId) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // Update token status
        const updatedToken = await prisma.token.update({
            where: {
                id: parseInt(tokenId)
            },
            data: {
                status: 'COMPLETED',
                updatedAt: new Date()
            }
        });


        return NextResponse.json({
            success: true,
            data: updatedToken
        });

    } catch (error) {
        console.error('Token completion error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to complete token',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}