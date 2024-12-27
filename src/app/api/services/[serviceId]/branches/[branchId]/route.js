import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;

        const { serviceId, branchId } = params;
        const parsedServiceId = parseInt(serviceId);
        const parsedBranchId = parseInt(branchId);

        // Validate IDs
        if (!parsedServiceId || !parsedBranchId || isNaN(parsedServiceId) || isNaN(parsedBranchId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid service ID or branch ID' },
                { status: 400 }
            );
        }

        // First, find the BranchService record
        const branchService = await prisma.branchService.findUnique({
            where: {
                branchId_serviceId: {
                    branchId: parsedBranchId,
                    serviceId: parsedServiceId
                }
            }
        });

        if (!branchService) {
            return NextResponse.json(
                { success: false, error: 'Service is not assigned to this branch' },
                { status: 404 }
            );
        }

        // Delete the BranchService record
        await prisma.branchService.delete({
            where: {
                branchId_serviceId: {
                    branchId: parsedBranchId,
                    serviceId: parsedServiceId
                }
            }
        });

        // Also delete related DeskService records
        await prisma.deskService.deleteMany({
            where: {
                AND: [
                    { serviceId: parsedServiceId },
                    { desk: { branchId: parsedBranchId } }
                ]
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Service removed from branch successfully'
        });

    } catch (error) {
        console.error('Error removing service from branch:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to remove service from branch',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}