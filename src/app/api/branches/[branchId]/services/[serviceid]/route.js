import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { branchId, serviceId } = params;

        await prisma.branchService.deleteMany({
            where: {
                branchId: parseInt(branchId),
                serviceId: parseInt(serviceId)
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Service removed from branch successfully'
        });
    } catch (error) {
        console.error('Error removing service from branch:', error);
        return NextResponse.json(
            { error: 'Failed to remove service from branch' },
            { status: 500 }
        );
    }
}