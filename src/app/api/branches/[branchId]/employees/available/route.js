import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { branchId } = params;
        const parsedBranchId = parseInt(branchId);

        // Get employees that:
        // 1. Belong to this branch
        // 2. Are not assigned to any desk or are currently assigned to the specified desk
        // 3. Have EMPLOYEE role
        // 4. Are ACTIVE
        const employees = await prisma.user.findMany({
            where: {
                branchId: parsedBranchId,
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                assignedDeskId: null // Only get unassigned employees
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                status: true
            }
        });

        return NextResponse.json({
            success: true,
            data: employees
        });
    } catch (error) {
        console.error('Error fetching available employees:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to fetch available employees'
            },
            { status: 500 }
        );
    }
}