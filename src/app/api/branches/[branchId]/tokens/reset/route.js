import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from '@/middleware/authMiddleware';
import { emitTokenUpdate } from '@/lib/socketServer';

export async function POST(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;
        
        const { role } = authResult;
        if (!['SUPERADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        const { branchId } = params;
        const parsedBranchId = parseInt(branchId);

        // Start a transaction to ensure all operations complete together
        await prisma.$transaction(async (prisma) => {
            // 1. Mark all pending tokens as 'CANCELLED'
            await prisma.token.updateMany({
                where: {
                    branchId: parsedBranchId,
                    status: 'PENDING'
                },
                data: {
                    status: 'CANCELLED'
                }
            });

            // 2. Reset all token series to their start values
            const tokenSeries = await prisma.tokenSeries.findMany({
                where: {
                    branchId: parsedBranchId,
                    active: true
                }
            });

            for (const series of tokenSeries) {
                await prisma.tokenSeries.update({
                    where: {
                        id: series.id
                    },
                    data: {
                        currentNumber: series.startFrom
                    }
                });
            }
        });

        // Emit update to refresh displays
        await emitTokenUpdate(parsedBranchId);

        return NextResponse.json({
            success: true,
            message: 'All tokens have been reset successfully'
        });

    } catch (error) {
        console.error('Error resetting tokens:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to reset tokens'
        }, { status: 500 });
    }
}