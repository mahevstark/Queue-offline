import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from '@/middleware/authMiddleware';

export async function GET(request, { params }) {
    try {
        // Properly await params
        const { branchId } = await params;
        const parsedBranchId = parseInt(branchId);

        const tokenSeries = await prisma.tokenSeries.findMany({
            where: {
                branchId: parsedBranchId
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
            data: tokenSeries || [] // Ensure we always return an array
        });

    } catch (error) {
        console.error('Token series GET error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch token series'
        }, { 
            status: 500 
        });
    }
}

// Create new token series
export async function POST(request, { params }) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) return authResult;
        
        const { role } = authResult;
        if (!['SUPERADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Unauthorized access' 
                },
                { status: 403 }
            );
        }

        const { branchId } = params;
        const seriesData = await request.json();

        // Check if there's an active series for this service
        if (seriesData.active) {
            const existingSeries = await prisma.tokenSeries.findFirst({
                where: {
                    branchId: parseInt(branchId),
                    serviceId: seriesData.serviceId,
                    active: true
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

        const newSeries = await prisma.tokenSeries.create({
            data: {
                branchId: parseInt(branchId),
                serviceId: seriesData.serviceId,
                prefix: seriesData.prefix.toUpperCase(),
                startFrom: seriesData.startFrom,
                endAt: seriesData.endAt,
                active: seriesData.active,
                currentNumber: seriesData.startFrom
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
            data: newSeries
        });

    } catch (error) {
        console.error('Error creating token series:', error);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'A token series with this prefix already exists' 
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to create token series' 
            },
            { status: 500 }
        );
    }
}