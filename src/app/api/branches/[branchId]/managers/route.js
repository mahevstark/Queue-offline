import { authMiddleware } from "@/middleware/authMiddleware";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId } = context.params;
        const parsedBranchId = parseInt(branchId);

        if (!parsedBranchId || isNaN(parsedBranchId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid branch ID' },
                { status: 400 }
            );
        }

        // Get the current desk ID from query params (if editing)
        const url = new URL(request.url);
        const currentDeskId = url.searchParams.get('deskId') ? 
            parseInt(url.searchParams.get('deskId')) : 
            null;

        // Get managers who:
        // 1. Belong to this branch
        // 2. Either have no desk assigned OR are managing the current desk being edited
        const branchManagers = await prisma.user.findMany({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE',
                managedBranchId: parsedBranchId,
                OR: [
                    { managedDeskId: null }, // No desk assigned
                    ...(currentDeskId ? [{ managedDeskId: currentDeskId }] : []) // Currently managing this desk (if editing)
                ]
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                managedDesk: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                }
            }
        });

        console.log('Found available branch managers:', branchManagers);

        return NextResponse.json({
            success: true,
            data: branchManagers
        });

    } catch (error) {
        console.error('Detailed error in GET branch managers:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch branch managers',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}