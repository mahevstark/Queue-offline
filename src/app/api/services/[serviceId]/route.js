import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

// GET single service
export async function GET(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        
        const { userId, role } = authResult;
        const { serviceId } = params;

        // Validate serviceId
        if (!serviceId || isNaN(parseInt(serviceId))) {
            return NextResponse.json(
                { error: 'Invalid service ID' },
                { status: 400 }
            );
        }

        // Find the service with its sub-services
        const service = await prisma.service.findUnique({
            where: {
                id: parseInt(serviceId)
            },
            include: {
                subServices: {
                    orderBy: {
                        name: 'asc'
                    }
                },
                branches: {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true,
                                managerId: true
                            }
                        }
                    }
                }
            }
        });

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        // For managers, verify they have access to this service
        if (role === 'MANAGER') {
            const hasAccess = service.branches.some(
                branchService => branchService.branch.managerId === userId
            );

            if (!hasAccess) {
                return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json(service);

    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json(
            { error: 'Failed to fetch service' },
            { status: 500 }
        );
    }
}

// PUT update service
export async function PUT(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        const { userId, role } = authResult;

        if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        const { serviceId } = params;
        const parsedServiceId = parseInt(serviceId);
        const body = await req.json();
        
        console.log('Update request body:', body); // Debug log
        
        const { name, status, branchIds = [], subServices = [] } = body;

        // Validate input
        if (!name || !status) {
            return NextResponse.json(
                { success: false, error: 'Name and status are required' },
                { status: 400 }
            );
        }

        console.log('Fetching existing service...'); // Debug log
        
        // Get existing service data
        const existingService = await prisma.service.findUnique({
            where: { id: parsedServiceId },
            include: {
                subServices: true,
                branches: true
            }
        });

        if (!existingService) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        console.log('Found existing service:', existingService); // Debug log

        if (role === 'MANAGER') {
            // Verify manager is updating service for their own branch
            const managerBranch = await prisma.branch.findFirst({
                where: { managerId: userId }
            });

            if (!managerBranch) {
                return NextResponse.json(
                    { error: 'No branch associated with this manager' },
                    { status: 403 }
                );
            }

            // Check if service is associated with manager's branch
            const serviceAccess = await prisma.branchService.findFirst({
                where: {
                    serviceId: parsedServiceId,
                    branchId: managerBranch.id
                }
            });

            if (!serviceAccess) {
                return NextResponse.json(
                    { error: 'Unauthorized to modify this service' },
                    { status: 403 }
                );
            }

            // Ensure manager can only update for their branch
            if (!branchIds.includes(managerBranch.id)) {
                return NextResponse.json(
                    { error: 'Manager can only update services for their own branch' },
                    { status: 403 }
                );
            }
        }

        // Update service in a transaction
        const updatedService = await prisma.$transaction(async (prisma) => {
            try {
                console.log('Starting transaction...'); // Debug log

                // 1. Update the main service first
                const updatedMainService = await prisma.service.update({
                    where: { id: parsedServiceId },
                    data: {
                        name,
                        status
                    }
                });
                console.log('Updated main service:', updatedMainService);

                // 2. Update branch relationships
                await prisma.branchService.deleteMany({
                    where: { serviceId: parsedServiceId }
                });
                console.log('Deleted existing branch relationships');

                if (branchIds.length > 0) {
                    await prisma.branchService.createMany({
                        data: branchIds.map(branchId => ({
                            serviceId: parsedServiceId,
                            branchId: parseInt(branchId),
                            status: 'ACTIVE'
                        }))
                    });
                    console.log('Created new branch relationships');
                }

                // 3. Handle sub-services
                const existingSubServiceIds = new Set(existingService.subServices.map(s => s.id));
                const updatedSubServiceIds = new Set(subServices.filter(s => s.id).map(s => s.id));
                const subServicesToDelete = [...existingSubServiceIds].filter(id => !updatedSubServiceIds.has(id));

                if (subServicesToDelete.length > 0) {
                    // First, delete related DeskSubService records
                    await prisma.deskSubService.deleteMany({
                        where: {
                            subServiceId: { in: subServicesToDelete }
                        }
                    });
                    console.log('Deleted related desk sub-services');

                    // Then, delete related BranchSubService records
                    await prisma.branchSubService.deleteMany({
                        where: {
                            subServiceId: { in: subServicesToDelete }
                        }
                    });
                    console.log('Deleted related branch sub-services');

                    // Finally, delete the sub-services
                    await prisma.subService.deleteMany({
                        where: { id: { in: subServicesToDelete } }
                    });
                    console.log('Deleted removed sub-services:', subServicesToDelete);
                }

                // 4. Update existing and create new sub-services
                for (const subService of subServices) {
                    if (subService.id) {
                        await prisma.subService.update({
                            where: { id: subService.id },
                            data: {
                                name: subService.name,
                                status: subService.status || 'ACTIVE'
                            }
                        });
                        console.log('Updated sub-service:', subService.id);
                    } else {
                        await prisma.subService.create({
                            data: {
                                name: subService.name,
                                status: 'ACTIVE',
                                serviceId: parsedServiceId
                            }
                        });
                        console.log('Created new sub-service:', subService.name);
                    }
                }

                // 5. Fetch and return updated service
                return await prisma.service.findUnique({
                    where: { id: parsedServiceId },
                    include: {
                        subServices: true,
                        branches: {
                            include: {
                                branch: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (transactionError) {
                console.error('Transaction error:', {
                    message: transactionError.message,
                    code: transactionError.code,
                    meta: transactionError.meta
                });
                throw transactionError;
            }
        });

        console.log('Update completed successfully'); // Debug log

        return NextResponse.json({
            success: true,
            data: updatedService
        });

    } catch (error) {
        console.error('Detailed error in PUT service:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to update service',
                details: process.env.NODE_ENV === 'development' ? {
                    message: error.message,
                    code: error.code,
                    meta: error.meta,
                    stack: error.stack
                } : undefined
            },
            { status: 500 }
        );
    }
}

// DELETE service
export async function DELETE(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        
        const { serviceId } = params;
        const parsedServiceId = parseInt(serviceId);

        console.log('Starting service deletion process for ID:', parsedServiceId);

        // Check if service exists with correct relationship names
        const existingService = await prisma.service.findUnique({
            where: { id: parsedServiceId },
            include: {
                tokens: true,
                tokenSeries: true,
                branches: true,
                desks: true,
                subServices: {
                    include: {
                        desks: true,
                        tokens: true
                    }
                }
            }
        });

        if (!existingService) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        // Delete everything in a transaction
        await prisma.$transaction(async (prisma) => {
            // 1. Update and delete tokens
            await prisma.token.updateMany({
                where: { 
                    OR: [
                        { serviceId: parsedServiceId },
                        { subServiceId: { in: existingService.subServices.map(s => s.id) } }
                    ]
                },
                data: { 
                    status: 'COMPLETED',
                    deskId: null
                }
            });
            
            await prisma.token.deleteMany({
                where: { 
                    OR: [
                        { serviceId: parsedServiceId },
                        { subServiceId: { in: existingService.subServices.map(s => s.id) } }
                    ]
                }
            });
            console.log('Handled tokens');

            // 2. Delete token series
            await prisma.tokenSeries.deleteMany({
                where: { serviceId: parsedServiceId }
            });
            console.log('Deleted token series');

            // 3. Delete desk services
            await prisma.deskService.deleteMany({
                where: { serviceId: parsedServiceId }
            });
            console.log('Deleted desk services');

            // 4. Delete desk sub-services
            await prisma.deskSubService.deleteMany({
                where: { 
                    subServiceId: { 
                        in: existingService.subServices.map(s => s.id) 
                    }
                }
            });
            console.log('Deleted desk sub-services');

            // 5. Delete service-branch relationships
            await prisma.branchService.deleteMany({
                where: { serviceId: parsedServiceId }
            });
            console.log('Deleted branch services');

            // 6. Delete branch sub-services
            await prisma.branchSubService.deleteMany({
                where: { 
                    subServiceId: { 
                        in: existingService.subServices.map(s => s.id) 
                    }
                }
            });
            console.log('Deleted branch sub-services');

            // 7. Delete sub-services
            await prisma.subService.deleteMany({
                where: { serviceId: parsedServiceId }
            });
            console.log('Deleted sub-services');

            // 8. Finally, delete the service
            await prisma.service.delete({
                where: { id: parsedServiceId }
            });
            console.log('Deleted service');
        });

        return NextResponse.json({
            success: true,
            message: 'Service deleted successfully'
        });

    } catch (error) {
        console.error('Detailed error in DELETE service:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to delete service',
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error.stack,
                    code: error.code,
                    meta: error.meta
                } : undefined
            },
            { status: 500 }
        );
    }
}