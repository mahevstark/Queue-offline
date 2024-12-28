import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/authService';

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                branch: true,
                assignedDesk: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        const transformedUser = {
            ...user,
            branchId: user.branch?.id || null,
            assignedDeskId: user.assignedDesk?.id || null,
        };

        return NextResponse.json({
            success: true,
            data: transformedUser
        });

    } catch (error) {
        console.error('Error in auth/user route:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Internal server error',
                details: error.message 
            },
            { status: 500 }
        );
    }
}