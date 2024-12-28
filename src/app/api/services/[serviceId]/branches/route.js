import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { serviceId } = params;
        const body = await req.json();
        const parsedServiceId = parseInt(serviceId);

        console.log('Received request:', { serviceId, body }); // Debug log

        // Validate serviceId
        if (!serviceId || isNaN(parsedServiceId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid service ID' },
                { status: 400 }
            );
        }

        // Validate branchIds
        if (!body.branchIds || !Array.isArray(body.branchIds) || body.branchIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Branch IDs are required and must be an array' },
                { status: 400 }
            );
        }

        const parsedBranchIds = body.branchIds.map(id => parseInt(id));

        // Check for invalid branch IDs
        if (parsedBranchIds.some(id => isNaN(id))) {
            return NextResponse.json(
                { success: false, error: 'Invalid branch ID format' },
                { status: 400 }
            );
        }

        // Check for existing relationships
        const existingRelations = await prisma.branchService.findMany({
            where: {
                AND: [
                    { serviceId: parsedServiceId },
                    { branchId: { in: parsedBranchIds } }
                ]
            }
        });

        if (existingRelations.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Service is already assigned to one or more of these branches' },
                { status: 400 }
            );
        }

        // Create the relationships
        await prisma.$transaction(
            parsedBranchIds.map(branchId =>
                prisma.branchService.create({
                    data: {
                        serviceId: parsedServiceId,
                        branchId: branchId,
                        status: 'ACTIVE'
                    }
                })
            )
        );

        // Get updated service data
        const updatedService = await prisma.service.findUnique({
            where: { id: parsedServiceId },
            include: {
                branches: {
                    include: {
                        branch: true
                    }
                },
                subServices: true
            }
        });

        if (!updatedService) {
            throw new Error('Failed to fetch updated service data');
        }

        console.log('Assignment successful:', updatedService);

        return NextResponse.json(updatedService);

    } catch (error) {
        console.error('Detailed error in service assignment:', error);
        
        return NextResponse.json(
            { 
                error: error.message || 'Failed to assign service to branch',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}