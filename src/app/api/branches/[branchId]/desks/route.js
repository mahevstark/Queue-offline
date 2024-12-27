import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

// GET all desks for a branch
export async function GET(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { userId, role } = authResult;
        const branchId = parseInt(params.branchId);
        
        if (!branchId || isNaN(branchId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid branch ID' },
                { status: 400 }
            );
        }

        // Add authorization check
        if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        const desks = await prisma.desk.findMany({
            where: {
                branchId: branchId
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

        return NextResponse.json({
            success: true,
            data: desks.map(desk => ({
                ...desk,
                employeeCount: desk._count.employees,
                _count: undefined
            }))
        });

    } catch (error) {
        console.error('Error fetching desks:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch desks',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// POST create new desk
export async function POST(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const branchId = parseInt(params.branchId);
        if (!branchId || isNaN(branchId)) {
            return NextResponse.json(
                { error: 'Invalid branch ID' },
                { status: 400 }
            );
        }

        const data = await req.json();

        if (!data.name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        console.log('Creating desk with data:', data);

        const desk = await prisma.desk.create({
            data: {
                name: data.name,
                displayName: data.displayName || data.name,
                description: data.description || '',
                status: data.status || 'ACTIVE',
                branch: {
                    connect: { id: branchId }
                },
                manager: data.managerId ? {
                    connect: { id: parseInt(data.managerId) }
                } : undefined,
                deskServices: {
                    create: data.serviceIds.map(serviceId => ({
                        service: { connect: { id: parseInt(serviceId) } }
                    }))
                },
                deskSubServices: {
                    create: data.subServiceIds.map(subServiceId => ({
                        subService: { connect: { id: parseInt(subServiceId) } }
                    }))
                }
            },
            include: {
                branch: true,
                manager: true,
                employees: true,
                deskServices: true,
                deskSubServices: true
            }
        });

        return NextResponse.json(desk, { status: 201 });
    } catch (error) {
        console.error('Error creating desk:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create desk' },
            { status: 500 }
        );
    }
}

// DELETE desk
export async function DELETE(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: authResult.status }
            );
        }

        // Get the desk ID from the URL
        const url = new URL(req.url);
        const deskId = parseInt(url.searchParams.get('deskId'));

        if (!deskId || isNaN(deskId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid desk ID' },
                { status: 400 }
            );
        }

        // First, update any users who are associated with this desk
        await prisma.$transaction([
            // Remove desk manager reference
            prisma.user.updateMany({
                where: { managedDeskId: deskId },
                data: { managedDeskId: null }
            }),
            // Remove desk employee references
            prisma.user.updateMany({
                where: { assignedDeskId: deskId },
                data: { assignedDeskId: null }
            }),
            // Delete desk services
            prisma.deskService.deleteMany({
                where: { deskId: deskId }
            }),
            // Delete desk sub-services
            prisma.deskSubService.deleteMany({
                where: { deskId: deskId }
            }),
            // Delete any tokens associated with the desk
            prisma.token.deleteMany({
                where: { deskId: deskId }
            }),
            // Finally, delete the desk
            prisma.desk.delete({
                where: { id: deskId }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: 'Desk deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting desk:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to delete desk'
            },
            { status: 500 }
        );
    }
}