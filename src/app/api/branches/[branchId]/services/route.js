import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET(request, { params }) {
    try {
        // Ensure we await the params
        const { branchId } = await params;
        
        if (!branchId) {
            return NextResponse.json(
                { success: false, error: 'Branch ID is required' },
                { status: 400 }
            );
        }

        const parsedBranchId = parseInt(branchId);

        const services = await prisma.branchService.findMany({
            where: {
                branchId: parsedBranchId,
                status: 'ACTIVE'
            },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        subServices: {
                            select: {
                                id: true,
                                name: true,
                                status: true
                            },
                            where: {
                                status: 'ACTIVE'
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: services.map(bs => bs.service)
        });

    } catch (error) {
        console.error('Services GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}

export async function POST(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        const { userId, role } = authResult;

        const { branchId } = params;
        const { serviceId } = await req.json();
        const parsedBranchId = parseInt(branchId);
        const parsedServiceId = parseInt(serviceId);

        if (role === 'MANAGER' || role === 'SUPERADMIN') {
            const hasAccess = await prisma.branch.findFirst({
                where: {
                    id: parsedBranchId,
                    managerId: userId
                }
            });

            if (!hasAccess) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 403 }
                );
            }
            } else if (role !== 'MANAGER' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const existingAssignment = await prisma.branchService.findFirst({
            where: {
                branchId: parsedBranchId,
                serviceId: parsedServiceId
            }
        });

        if (existingAssignment) {
            return NextResponse.json(
                { error: 'Service is already assigned to this branch' },
                { status: 400 }
            );
        }

        const service = await prisma.service.findUnique({
            where: { id: parsedServiceId }
        });

        if (service.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Cannot assign inactive service' },
                { status: 400 }
            );
        }

        const branchService = await prisma.branchService.create({
            data: {
                branchId: parsedBranchId,
                serviceId: parsedServiceId
            },
            include: {
                service: {
                    include: {
                        subServices: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: branchService
        });
    } catch (error) {
        console.error('Error assigning service to branch:', error);
        return NextResponse.json(
            { error: 'Failed to assign service to branch' },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;
        const { userId, role } = authResult;

        const { branchId } = params;
        const { serviceId } = await req.json();
        const parsedBranchId = parseInt(branchId);
        const parsedServiceId = parseInt(serviceId);

        // Authorization check
        if (role === 'MANAGER' || role === 'SUPERADMIN') {
            const hasAccess = await prisma.branch.findFirst({
                where: {
                    id: parsedBranchId,
                    managerId: userId
                }
            });

            if (!hasAccess) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 403 }
                );
            }
        }

        await prisma.branchService.deleteMany({
            where: {
                branchId: parsedBranchId,
                serviceId: parsedServiceId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing service from branch:', error);
        return NextResponse.json(
            { error: 'Failed to remove service from branch' },
            { status: 500 }
        );
    }
}