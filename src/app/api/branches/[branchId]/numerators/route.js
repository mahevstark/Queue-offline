import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from "@/middleware/authMiddleware";

export async function GET(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId } = context.params;
        
        const numerators = await prisma.numerator.findMany({
            where: {
                branchId: parseInt(branchId)
            },
            orderBy: {
                serialNo: 'asc'
            }
        });

        return NextResponse.json(numerators);
    } catch (error) {
        console.error('Error fetching numerators:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, context) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { branchId } = context.params;
        const data = await request.json();
        console.log('Data received:', data);
        const newNumerator = await prisma.numerator.create({
            data: {
                name: data.name,
                serialNo: data.serialNo,
                branchId: parseInt(branchId),
                status: data.status
            }
        });

        return NextResponse.json(newNumerator);
    } catch (error) {
        console.error('Error creating numerator:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
