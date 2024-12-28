import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { branchId, serviceid } = params;

        const subServices = await prisma.subService.findMany({
            where: {
                serviceId: parseInt(serviceid),
                status: 'ACTIVE',
                service: {
                    branches: {
                        some: {
                            branchId: parseInt(branchId),
                            status: 'ACTIVE'
                        }
                    }
                }
            },
            include: {
                service: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: subServices
        });

    } catch (error) {
        console.error('Error fetching sub-services:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to fetch sub-services' 
            },
            { status: 500 }
        );
    }
}