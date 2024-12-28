import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/clientAuth";
// GET single desk
export async function GET(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId, deskId } = context.params;
        const parsedBranchId = parseInt(branchId);
        const parsedDeskId = parseInt(deskId);

        if (!parsedBranchId || !parsedDeskId || isNaN(parsedBranchId) || isNaN(parsedDeskId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid branch ID or desk ID' },
                { status: 400 }
            );
        }

        const desk = await prisma.desk.findUnique({
            where: {
                id: parsedDeskId,
                branchId: parsedBranchId
            },
            include: {
                branch: true,
                manager: true,
                employees: true,
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
                _count: {
                    select: {
                        employees: true
                    }
                }
            }
        });

        if (!desk) {
            return NextResponse.json(
                { success: false, error: 'Desk not found' },
                { status: 404 }
            );
        }

        // Transform the data
        const transformedDesk = {
            ...desk,
            employeeCount: desk._count.employees,
            _count: undefined
        };

        return NextResponse.json({
            success: true,
            data: transformedDesk
        });

    } catch (error) {
        console.error('Error fetching desk:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to fetch desk',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

// PUT update desk
export async function PUT(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId, deskId } = context.params;
        const data = await request.json();

        console.log('Received update data:', { branchId, deskId, data }); // Debug log

        // Validate input data
        if (!data.name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

      
            // Start a transaction to handle manager reassignment
            const result = await prisma.$transaction(async (prisma) => {
                console.log('Updating desk with data:', { branchId, deskId, data });
                // First, update any tokens that reference the old desk-subservice combinations
                await prisma.token.updateMany({
                    where: {
                        deskId: parseInt(deskId),
                    },
                    data: {
                        deskId: null, // Temporarily remove the desk reference
                    }
                });

                // Now update the desk with the new data
                const updatedDesk = await prisma.desk.update({
                    where: {
                        id: parseInt(deskId),
                        branchId: parseInt(branchId)
                    },
                    data: {
                        name: data.name,
                        displayName: data.displayName,
                        description: data.description,
                        status: data.status,
                        deskServices: {
                            deleteMany: {},
                            create: data.serviceIds?.map(serviceId => ({
                                serviceId: parseInt(serviceId)
                            })) || []
                        },
                        deskSubServices: {
                            deleteMany: {},
                            create: data.subServiceIds?.map(subServiceId => ({
                                subServiceId: parseInt(subServiceId)
                            })) || []
                        }
                    },
                    include: {
                        branch: true,
                        manager: true,
                        deskServices: {
                            include: {
                                service: true
                            }
                        },
                        deskSubServices: {
                            include: {
                                subService: true
                            }
                        }
                    }
                });

                // Optionally, reassign tokens to the desk if needed
                // This step depends on your business logic
                
                return updatedDesk;
            });

            console.log('Update successful:', result); 

            return NextResponse.json({
                success: true,
                data: result
            });

      
    } catch (error) {
        console.error('Error updating desk:', error.message);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to update desk',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

// DELETE desk
export async function DELETE(req, { params }) {
    try {
        // Verify authentication
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        
        const { role } = authResult;
        if (!['SUPERADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }
        const { branchId, deskId } = params;
        const parsedDeskId = parseInt(deskId);
        const parsedBranchId = parseInt(branchId);

        console.log('Attempting to delete desk:', { parsedDeskId, parsedBranchId });

        if (!parsedDeskId || !parsedBranchId) {
            return NextResponse.json(
                { success: false, error: 'Invalid desk ID or branch ID' },
                { status: 400 }
            );
        }

        // Check if desk exists
        const desk = await prisma.desk.findFirst({
            where: {
                id: parsedDeskId,
                branchId: parsedBranchId
            }
        });

        if (!desk) {
            return NextResponse.json(
                { success: false, error: 'Desk not found' },
                { status: 404 }
            );
        }

        console.log('Found desk to delete:', desk);

        // Delete all related records in a transaction
        await prisma.$transaction([
            // Update users who are assigned to this desk
            prisma.user.updateMany({
                where: { assignedDeskId: parsedDeskId },
                data: { assignedDeskId: null }
            }),
            // Update users who manage this desk
            prisma.user.updateMany({
                where: { managedDeskId: parsedDeskId },
                data: { managedDeskId: null }
            }),
            // Delete desk services
            prisma.deskService.deleteMany({
                where: { deskId: parsedDeskId }
            }),
            // Delete desk sub-services
            prisma.deskSubService.deleteMany({
                where: { deskId: parsedDeskId }
            }),
            // Delete tokens associated with the desk
            prisma.token.deleteMany({
                where: { deskId: parsedDeskId }
            }),
            // Finally, delete the desk itself
            prisma.desk.delete({
                where: { id: parsedDeskId }
            })
        ]);

        console.log('Desk deleted successfully');

        return NextResponse.json({
            success: true,
            message: 'Desk deleted successfully'
        });

    } catch (error) {
        console.error('Detailed error in DELETE desk:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to delete desk',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}