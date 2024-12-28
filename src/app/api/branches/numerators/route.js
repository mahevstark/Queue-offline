import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from "@/middleware/authMiddleware";

export async function GET(request) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        // Get user from auth middleware
        const user = authResult;
        console.log('User:', user);
        let numerators;

        // If user is a manager, only get numerators from their branch
        if (user.role === 'MANAGER') {
            numerators = await prisma.numerator.findMany({
                where: {
                    branch: {
                        managerId: user.id
                    }
                },
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            managerId: true
                        }
                    }
                },
                orderBy: [
                    {
                        branch: {
                            name: 'asc'
                        }
                    },
                    {
                        serialNo: 'asc'
                    }
                ]
            });
        } 
        // For superadmin, get all numerators
        else if (user.role === 'SUPERADMIN') {
            numerators = await prisma.numerator.findMany({
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            managerId: true
                        }
                    }
                },
                orderBy: [
                    {
                        branch: {
                            name: 'asc'
                        }
                    },
                    {
                        serialNo: 'asc'
                    }
                ]
            });
        } 
        else {
            return NextResponse.json({ 
                success: false, 
                error: 'Unauthorized access' 
            }, { status: 403 });
        }

        console.log('Numerators:', numerators);
        return NextResponse.json(numerators);
    } catch (error) {
        console.error('Error fetching numerators:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Failed to fetch numerators'
        }, { status: 500 });
    }
}