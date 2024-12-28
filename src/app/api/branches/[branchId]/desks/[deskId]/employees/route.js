import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
    try {
        const { branchId, deskId } = params;
        const { employeeIds } = await request.json();

        console.log('Processing employee assignment:', { branchId, deskId, employeeIds });

        if (!Array.isArray(employeeIds)) {
            return NextResponse.json(
                { error: 'Employee IDs must be an array' },
                { status: 400 }
            );
        }

        // Update employee assignments in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Clear existing assignments
            await tx.user.updateMany({
                where: {
                    assignedDeskId: parseInt(deskId)
                },
                data: {
                    assignedDeskId: null
                }
            });

            // Assign new employees if any
            if (employeeIds.length > 0) {
                await tx.user.updateMany({
                    where: {
                        id: {
                            in: employeeIds.map(id => parseInt(id))
                        }
                    },
                    data: {
                        assignedDeskId: parseInt(deskId)
                    }
                });
            }

            // Return updated desk with employees
            return await tx.desk.findUnique({
                where: {
                    id: parseInt(deskId)
                },
                include: {
                    employees: true
                }
            });
        });

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to assign employees'
            },
            { status: 500 }
        );
    }
}