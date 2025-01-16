import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from '@/middleware/authMiddleware';

export async function PATCH(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;
        
        const { userId ,role} = authResult;
        if (!['SUPERADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Unauthorized access' 
                },
                { status: 403 }
            );
        }

        const { branchId, seriesId } = params;
        const { active } = await request.json();

        const updatedSeries = await prisma.tokenSeries.update({
            where: {
                id: parseInt(seriesId),
                branchId: parseInt(branchId)
            },
            data: { active },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedSeries
        });

    } catch (error) {
        console.error('Error updating token series status:', error);
        
        if (error.code === 'P2025') {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Token series not found' 
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to update token series status' 
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;
        
        const { role } = authResult;
        if (!['SUPERADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        const { branchId, seriesId } = params;

        await prisma.tokenSeries.delete({
            where: {
                id: parseInt(seriesId),
                branchId: parseInt(branchId)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting token series:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete token series' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;
        
        const { role } = authResult;
        if (!['MANAGER', 'SUPERADMIN'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        const { branchId, seriesId } = params;
        const updateData = await request.json();

        // First get the current series data
        const currentSeries = await prisma.tokenSeries.findUnique({
            where: {
                id: parseInt(seriesId),
                branchId: parseInt(branchId)
            }
        });

        if (!currentSeries) {
            return NextResponse.json(
                { success: false, error: 'Token series not found' },
                { status: 404 }
            );
        }

        // When updating startFrom, we need to reset currentNumber to the new startFrom value
        // This ensures the next token will start from the new range
        const newCurrentNumber = parseInt(updateData.startFrom) - 1;

        // Validate that the new current number doesn't exceed the new end range
        if (newCurrentNumber >= parseInt(updateData.endAt)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Invalid range: startFrom must be less than endAt' 
                },
                { status: 400 }
            );
        }

        // Check for active series conflict
        if (updateData.active) {
            const existingSeries = await prisma.tokenSeries.findFirst({
                where: {
                    branchId: parseInt(branchId),
                    serviceId: updateData.serviceId,
                    active: true,
                    id: { not: parseInt(seriesId) }
                }
            });

            if (existingSeries) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'An active token series already exists for this service' 
                    },
                    { status: 409 }
                );
            }
        }

        // Check for duplicate prefix
        const existingPrefix = await prisma.tokenSeries.findFirst({
            where: {
                branchId: parseInt(branchId),
                prefix: updateData.prefix,
                id: { not: parseInt(seriesId) }
            }
        });

        if (existingPrefix) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'A token series with this prefix already exists' 
                },
                { status: 409 }
            );
        }

        const updatedSeries = await prisma.tokenSeries.update({
            where: {
                id: parseInt(seriesId),
                branchId: parseInt(branchId)
            },
            data: {
                prefix: updateData.prefix?.toUpperCase(),
                startFrom: parseInt(updateData.startFrom),
                endAt: parseInt(updateData.endAt),
                currentNumber: newCurrentNumber,
                serviceId: parseInt(updateData.serviceId),
                active: updateData.active
            },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedSeries
        });
    } catch (error) {
        console.error('Error updating token series:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to update token series' 
            },
            { status: 500 }
        );
    }
}