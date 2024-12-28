import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/authService';

export const ROLES = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE'
};

export const checkRole = (allowedRoles) => {
    return async (req) => {
        try {
            const token = req.headers.get('Authorization')?.replace('Bearer ', '');

            if (!token) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return NextResponse.json(
                    { error: 'Invalid token' },
                    { status: 401 }
                );
            }

            if (!allowedRoles.includes(decoded.role)) {
                return NextResponse.json(
                    { error: 'Unauthorized access' },
                    { status: 403 }
                );
            }

            // Add user info to request for downstream use
            req.user = decoded;
            return true;
        } catch (error) {
            console.error('Role check error:', error);
            return NextResponse.json(
                { error: 'Authorization failed' },
                { status: 401 }
            );
        }
    };
};

export const checkManagerAccess = async (req, branchId) => {
    const user = req.user;

    if (user.role === ROLES.MANAGER && user.managedBranchId !== branchId) {
        return NextResponse.json(
            { error: 'Unauthorized: Managers can only access their own branch' },
            { status: 403 }
        );
    }

    return true;
};