import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/authMiddleware";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { serviceId } = params;
        const { name, status = 'ACTIVE' } = await req.json();

        const subService = await prisma.subService.create({
            data: {
                name: name.trim(),
                status,
                serviceId: parseInt(serviceId)
            }
        });

        return NextResponse.json(subService);
    } catch (error) {
        console.error('Error creating sub-service:', error);
        return NextResponse.json(
            { error: 'Failed to create sub-service' },
            { status: 500 }
        );
    }
}

export async function PUT(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { serviceId, subServiceId } = params;
        const { name, status } = await req.json();

        const subService = await prisma.subService.update({
            where: {
                id: parseInt(subServiceId),
                serviceId: parseInt(serviceId)
            },
            data: {
                name: name.trim(),
                status
            }
        });

        return NextResponse.json(subService);
    } catch (error) {
        console.error('Error updating sub-service:', error);
        return NextResponse.json(
            { error: 'Failed to update sub-service' },
            { status: 500 }
        );
    }
}