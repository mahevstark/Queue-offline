import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verify } from 'jsonwebtoken';

// Helper function to verify authentication
async function verifyAuth(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return { success: false, error: 'No authorization token provided' };
        }

        const token = authHeader.split(' ')[1];
        const decoded = verify(token, "d7ac385848b71c3131f75cd0fcd8956d9280a575425fa131b30ccb4c4e161ce5");
        
        if (decoded.role !== 'MANAGER' && decoded.role !== 'SUPERADMIN') {
            return { success: false, error: 'Unauthorized access' };
        }

        return { success: true, user: decoded };
    } catch (error) {
        console.error('Auth verification error:', error);
        return { success: false, error: 'Invalid token' };
    }
}

export async function DELETE(request, context) {
    try {
        // Verify authentication
        const auth = await verifyAuth(request);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: 401 });
        }

        const { branchId } = await context.params;
        const { employeeId } = await request.json();

        console.log('Processing removal - Branch:', branchId, 'Employee:', employeeId);

        const updatedEmployee = await prisma.user.update({
            where: { 
                id: parseInt(employeeId),
                branchId: parseInt(branchId)
            },
            data: { branchId: null }
        });

        return NextResponse.json({
            success: true,
            data: updatedEmployee
        });

    } catch (error) {
        console.error('Employee removal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to remove employee' },
            { status: 500 }
        );
    }
}

export async function POST(request, context) {
    try {
        // Verify authentication
        const auth = await verifyAuth(request);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: 401 });
        }

        const { branchId } = await context.params;
        const { employeeId } = await request.json();

        console.log('Processing addition - Branch:', branchId, 'Employee:', employeeId);

        const updatedEmployee = await prisma.user.update({
            where: { id: parseInt(employeeId) },
            data: { branchId: parseInt(branchId) }
        });

        return NextResponse.json({
            success: true,
            data: updatedEmployee
        });

    } catch (error) {
        console.error('Employee addition error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to add employee' },
            { status: 500 }
        );
    }
}