import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from "@/middleware/authMiddleware";

export async function PUT(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId, numeratorId } = context.params;
        const data = await request.json();

        console.log('Updating numerator:', { branchId, numeratorId, data });

        // Check if numerator exists
        const existingNumerator = await prisma.numerator.findUnique({
            where: {
                id: parseInt(numeratorId)
            }
        });

        if (!existingNumerator) {
            return NextResponse.json({ 
                success: false, 
                error: 'Numerator not found' 
            }, { status: 404 });
        }

        // Check for duplicate serial number
        const duplicateSerialNo = await prisma.numerator.findFirst({
            where: {
                branchId: parseInt(branchId),
                serialNo: parseInt(data.serialNo),
                id: { not: parseInt(numeratorId) }
            }
        });

        if (duplicateSerialNo) {
            return NextResponse.json({ 
                success: false, 
                error: 'Serial number already exists in this branch' 
            }, { status: 400 });
        }

        const updatedNumerator = await prisma.numerator.update({
            where: { 
                id: parseInt(numeratorId)
            },
            data: {
                name: data.name,
                serialNo: parseInt(data.serialNo),
                status: data.status
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedNumerator
        });
    } catch (error) {
        console.error('Error updating numerator:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Failed to update numerator'
        }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId, numeratorId } = context.params;
        
        console.log('Deleting numerator:', { branchId, numeratorId });

        // Check if numerator exists
        const existingNumerator = await prisma.numerator.findUnique({
            where: {
                id: parseInt(numeratorId)
            }
        });

        if (!existingNumerator) {
            return NextResponse.json({ 
                success: false, 
                error: 'Numerator not found' 
            }, { status: 404 });
        }

        // Delete the numerator
        await prisma.numerator.delete({
            where: {
                id: parseInt(numeratorId)
            }
        });

        return NextResponse.json({ 
            success: true,
            message: 'Numerator deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting numerator:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Failed to delete numerator'
        }, { status: 500 });
    }
} 