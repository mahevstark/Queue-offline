import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;

        const { branchId, deskId } = params;
        const parsedBranchId = parseInt(branchId);
        const parsedDeskId = parseInt(deskId);

        const body = await request.json();
        const { subServiceIds } = body;

        if (!Array.isArray(subServiceIds)) {
            return NextResponse.json(
                { success: false, error: 'Invalid sub-service IDs format' },
                { status: 400 }
            );
        }

        // Update desk sub-services in a transaction
        const updatedDesk = await prisma.$transaction(async (prisma) => {
            // First, update any tokens that reference the desk-subservice combinations being removed
            await prisma.token.updateMany({
                where: {
                    deskId: parsedDeskId,
                    status: {
                        in: ['PENDING', 'SERVING']
                    }
                },
                data: {
                    status: 'COMPLETED'
                }
            });

            // Then disconnect tokens from desk-subservice
            await prisma.token.updateMany({
                where: {
                    deskId: parsedDeskId
                },
                data: {
                    deskId: null
                }
            });

            // Now safe to delete existing desk sub-services
            await prisma.deskSubService.deleteMany({
                where: { deskId: parsedDeskId }
            });

            // Create new sub-service assignments
            const desk = await prisma.desk.update({
                where: {
                    id: parsedDeskId,
                    branchId: parsedBranchId
                },
                data: {
                    deskSubServices: {
                        create: subServiceIds.map(id => ({
                            subServiceId: parseInt(id)
                        }))
                    }
                },
                include: {
                    deskServices: {
                        include: {
                            service: true
                        }
                    },
                    deskSubServices: {
                        include: {
                            subService: true
                        }
                    },
                    branch: true,
                    manager: true,
                    employees: true
                }
            });

            return desk;
        });

        return NextResponse.json({
            success: true,
            data: updatedDesk
        });

    } catch (error) {
        console.error('Detailed error in PUT sub-services:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to assign sub-services',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}