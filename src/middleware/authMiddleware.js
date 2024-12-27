import { verifyToken } from '@/lib/authService';
import { cookies } from 'next/headers';

export async function authMiddleware(req) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unauthorized',
                message: 'No token provided' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const decoded = await verifyToken(token);
        
        if (!decoded) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unauthorized',
                message: 'Invalid token' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return {
            userId: decoded.id,
            role: decoded.role,
            branchId: Number(decoded.branchId),
            email: decoded.email,
            name: decoded.name
        };

    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Unauthorized',
            message: 'Authentication failed' 
        }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}