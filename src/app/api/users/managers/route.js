import { authMiddleware } from "@/middleware/authMiddleware";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) {
            return authResult;
        }

        const managers = await prisma.user.findMany({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE'
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                managedBranch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return Response.json({
            success: true,
            data: managers
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch managers',
            message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
        }, { status: 500 });
    }
}