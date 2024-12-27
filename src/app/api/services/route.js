import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

// GET all services
export async function GET(req) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) {
            return authResult;
        }
        
        const { userId, role } = authResult;
        
        let services;
        
        if (role === 'SUPERADMIN') {
            // Superadmin can see all services
            services = await prisma.service.findMany({
                include: {
                    subServices: true,
                    branches: {
                        include: {
                            branch: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else if (role === 'MANAGER') {
            // Manager can see services associated with their branch
            const managerBranch = await prisma.branch.findFirst({
                where: { managerId: userId }
            });

            if (!managerBranch) {
                return NextResponse.json(
                    { error: 'No branch associated with this manager' },
                    { status: 404 }
                );
            }

            // Modified query to handle manager's view
            services = await prisma.service.findMany({
                where: {
                    branches: {
                        some: {
                            branchId: managerBranch.id
                        }
                    }
                },
                include: {
                    subServices: true,
                    branches: {
                        where: {
                            branchId: managerBranch.id
                        },
                        include: {
                            branch: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Filter services after fetching to include SUPERADMIN created services
            services = services.filter(service => 
                service.creatorRole === 'SUPERADMIN' || 
                service.branches.some(b => b.branch.id === managerBranch.id)
            );
        } else {
            return NextResponse.json(
                { error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        return NextResponse.json(services);
    } catch (error) {
        console.error('Error in services API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST new service
export async function POST(req) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        const { userId, role } = authResult;

        const body = await req.json();
        const { name, branchIds = [], subServices = [] } = body;

        if (role === 'MANAGER') {
            // Verify manager is creating service for their own branch
            const managerBranch = await prisma.branch.findFirst({
                where: { managerId: userId }
            });

            if (!managerBranch) {
                return NextResponse.json(
                    { error: 'No branch associated with this manager' },
                    { status: 404 }
                );
            }

            if (!branchIds.includes(managerBranch.id)) {
                return NextResponse.json(
                    { error: 'Manager can only create services for their own branch' },
                    { status: 403 }
                );
            }
        }

        const service = await prisma.service.create({
            data: {
                name,
                status: 'ACTIVE',
                creatorRole: role === 'SUPERADMIN' ? "SUPERADMIN" : "MANAGER",
                branches: {
                    create: branchIds.map(branchId => ({
                        branch: { connect: { id: parseInt(branchId) } }
                    }))
                },
                subServices: {
                    create: subServices.map(subService => ({
                        name: subService.name,
                        status: 'ACTIVE'
                    }))
                }
            },
            include: {
                subServices: true,
                branches: {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error creating service:', error.message);
        return NextResponse.json(
            { error: 'Failed to create service' },
            { status: 500 }
        );
    }
}
