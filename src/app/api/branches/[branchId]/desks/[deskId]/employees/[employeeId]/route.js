import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/authMiddleware";

export async function DELETE(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId, deskId, employeeId } = context.params;
        const parsedBranchId = parseInt(branchId);
        const parsedDeskId = parseInt(deskId);
        const parsedEmployeeId = parseInt(employeeId);

        // First, check if the employee is a manager
        const employee = await prisma.user.findUnique({
            where: { id: parsedEmployeeId },
            select: { role: true }
        });


        // If not a manager, proceed with removal
        await prisma.desk.update({
            where: {
                id: parsedDeskId,
                branchId: parsedBranchId
            },
            data: {
                employees: {
                    disconnect: {
                        id: parsedEmployeeId
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Employee removed from desk successfully'
        });

    } catch (error) {
        console.error('Error in DELETE desk employee:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to remove employee from desk' 
            },
            { status: 500 }
        );
    }
}