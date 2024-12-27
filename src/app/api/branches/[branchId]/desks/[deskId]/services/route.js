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

        console.log('Processing service assignment:', { parsedBranchId, parsedDeskId }); // Debug log

        const body = await request.json();
        console.log('Received request body:', body); // Debug log

        const { serviceIds } = body;

        if (!Array.isArray(serviceIds)) {
            return NextResponse.json(
                { success: false, error: 'Invalid service IDs format' },
                { status: 400 }
            );
        }

        // Validate desk exists
        const existingDesk = await prisma.desk.findUnique({
            where: {
                id: parsedDeskId,
                branchId: parsedBranchId
            }
        });

        if (!existingDesk) {
            return NextResponse.json(
                { success: false, error: 'Desk not found' },
                { status: 404 }
            );
        }

        // Update desk services in a transaction
        const updatedDesk = await prisma.$transaction(async (prisma) => {
            console.log('Starting transaction for desk update'); // Debug log

            // Delete existing services
            await prisma.deskService.deleteMany({
                where: { deskId: parsedDeskId }
            });

            console.log('Creating new service assignments'); // Debug log

            // Create new service assignments
            const desk = await prisma.desk.update({
                where: {
                    id: parsedDeskId,
                    branchId: parsedBranchId
                },
                data: {
                    deskServices: {
                        create: serviceIds.map(id => ({
                            serviceId: parseInt(id)
                        }))
                    }
                },
                include: {
                    deskServices: {
                        include: {
                            service: true
                        }
                    },
                    branch: true,
                    manager: true,
                    employees: true
                }
            });

            console.log('Updated desk:', desk); // Debug log
            return desk;
        });

        return NextResponse.json({
            success: true,
            data: updatedDesk
        });

    } catch (error) {
        console.error('Detailed error in PUT services:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to assign services',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}