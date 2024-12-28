import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/middleware/authMiddleware';
import bcrypt from 'bcrypt';
export async function GET(request, context) {
    try {
        const userId = context.params.id;
        
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                status: true,
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            data: user 
        });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch user' 
        }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const data = await req.json();
    const userId = params.id;

    if(data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        password: data.password,
        status: data.status,
        // Add other fields as needed
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    return Response.json({ 
      success: true, 
      data: updatedUser 
    });

  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ 
      success: false, 
      error: 'Update failed',
      message: error.message
    }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
    try {
        const authResult = await authMiddleware(req);
        if (authResult instanceof Response) return authResult;

        const { id } = params;
        // Convert string ID to integer
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Bad Request',
                message: 'Invalid user ID format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if user exists before attempting to delete
        const user = await prisma.user.findUnique({
            where: { id: userId }  // Now using integer ID
        });

        if (!user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Not Found',
                message: 'User not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Perform the deletion with integer ID
        await prisma.user.delete({
            where: { id: userId }
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'User deleted successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete error details:', error);

        return new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Failed to delete user'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
