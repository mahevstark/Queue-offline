import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { branchId } = params;
        
        if (!branchId) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Branch ID is required'
                },
                { status: 400 }
            );
        }

        console.log('Fetching employees for branch:', branchId); // Debug log

        const parsedBranchId = parseInt(branchId);

        // Get all employees from this branch
        const employees = await prisma.user.findMany({
            where: {
                branchId: parsedBranchId,
                role: 'EMPLOYEE',
                status: 'ACTIVE',
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                status: true,
                isAvailable: true,
                assignedDeskId: true,
                assignedDesk: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                }
            },
            orderBy: {
                fullName: 'asc'
            }
        });

        console.log('Found employees:', employees); // Debug log

        return NextResponse.json({
            success: true,
            data: employees
        });
    } catch (error) {
        console.error('Error fetching branch employees:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to fetch branch employees'
            },
            { status: 500 }
        );
    }
}