import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emitTokenUpdate } from '@/lib/socketServer';

export async function POST(request, { params }) {
    try {
        const { branchId } = params;
        const { serviceId, subServiceId } = await request.json();

        // 1. First check if service is assigned to any desk
        const serviceDesks = await prisma.deskSubService.count({
            where: {
                subServiceId: parseInt(subServiceId)
            }
        });

        if (serviceDesks === 0) {
            return NextResponse.json({
                success: false,
                error: 'This service is not assigned to any counter yet. Please contact the administrator.'
            }, { status: 400 });
        }

        // 2. Check for available desk and employee
        const availableDesk = await prisma.deskSubService.findFirst({
            where: {
                subServiceId: parseInt(subServiceId),
                desk: {
                    status: 'ACTIVE',
                    employees: {
                        some: {
                            isAvailable: true,
                            status: 'ACTIVE'
                        }
                    }
                }
            },
            include: {
                desk: {
                    include: {
                        employees: {
                            where: {
                                isAvailable: true,
                                status: 'ACTIVE'
                            }
                        }
                    }
                }
            }
        });

        if (!availableDesk) {
            return NextResponse.json({
                success: false,
                error: 'No available counter or staff found for this service at the moment. Please try again later.'
            }, { status: 400 });
        }

        // 3. Check for token series
        const tokenSeries = await prisma.tokenSeries.findFirst({
            where: {
                branchId: parseInt(branchId),
                serviceId: parseInt(serviceId),
                active: true
            }
        });

        if (!tokenSeries) {
            return NextResponse.json({
                success: false,
                error: 'Token series not configured for this service. Please contact the administrator.'
            }, { status: 400 });
        }

        // If all checks pass, generate the token
        const nextNumber = tokenSeries.currentNumber + 1;
        
        const token = await prisma.token.create({
            data: {
                displayNumber: `${tokenSeries.prefix}${nextNumber.toString().padStart(3, '0')}`,
                sequenceNumber: nextNumber,
                status: 'PENDING',
                branchId: parseInt(branchId),
                serviceId: parseInt(serviceId),
                subServiceId: parseInt(subServiceId),
                deskId: availableDesk.deskId,
                assignedToId: availableDesk.desk.employees[0].id
            },
            include: {
                desk: true,
                assignedTo: true,
                service: true,
                subService: true
            }
        });

        // Update token series
        await prisma.tokenSeries.update({
            where: { id: tokenSeries.id },
            data: { currentNumber: nextNumber }
        });

        // After successful token generation, emit the update
        await emitTokenUpdate(parseInt(branchId)); // Pass the branchId

        return NextResponse.json({
            success: true,
            data: {
                ...token,
                assignedDesk: {
                    name: token.desk.name,
                    displayName: token.desk.displayName
                },
                assignedEmployee: {
                    name: token.assignedTo.fullName
                }
            }
        });

    } catch (error) {
        console.error('Error generating token:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate token. Please try again.',
            details: error.message
        }, { status: 500 });
    }
}
