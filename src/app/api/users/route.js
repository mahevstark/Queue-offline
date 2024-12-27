import { authMiddleware } from "@/middleware/authMiddleware";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function GET(req) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    let where = {};

    if (authResult.role === 'MANAGER') {
      // Find the branch where this user is the manager
      const managedBranch = await prisma.branch.findFirst({
        where: { managerId: authResult.userId }
      });

      if (!managedBranch) {
        return Response.json({ 
          success: true, 
          data: [],
          count: 0 
        });
      }

      where = {
        AND: [
          { role: 'EMPLOYEE' },
          {
            OR: [
              { branchId: managedBranch.id },  // Current branch employees
              { 
                AND: [
                  { branchId: null },          // Unassigned employees
                  { status: 'ACTIVE' }         // Only active unassigned employees
                ]
              }
            ]
          }
        ]
      };
    } else if (authResult.role === 'SUPERADMIN') {
      where = {
        NOT: {
          role: 'SUPERADMIN'
        }
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        createdAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Transform users data to include managed branch for managers
    const transformedUsers = await Promise.all(users.map(async user => {
      let userBranch = user.branch;
      
      // If user is a manager, find their managed branch
      if (user.role === 'MANAGER') {
        const managedBranch = await prisma.branch.findFirst({
          where: { managerId: user.id },
          select: {
            id: true,
            name: true,
            managerId: true
          }
        });
        if (managedBranch) {
          userBranch = managedBranch;
        }
      }

      return {
        ...user,
        branch: userBranch,
        isAssignable: user.branchId === null && user.role === 'EMPLOYEE' && user.status === 'ACTIVE'
      };
    }));

    return Response.json({ 
      success: true, 
      data: transformedUsers,
      count: transformedUsers.length 
    });

  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return Response.json({ 
      success: false, 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { userId, role } = authResult;
    const data = await req.json();
    
    // Log incoming data for debugging
    console.log('Received user data:', {
      ...data,
      password: '[REDACTED]'
    });
    
    // Validate required fields
    const requiredFields = ['email', 'fullName', 'password'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return Response.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Enhanced input validation
    if (!data.email?.includes('@')) {
      return Response.json({ 
        success: false, 
        error: 'Validation error',
        message: 'Invalid email format'
      }, { status: 400 });
    }

    if (data.password?.length < 8) {
      return Response.json({ 
        success: false, 
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return Response.json({ 
        success: false, 
        error: 'User with this email already exists',
        message: 'User with this email already exists'
      }, { status: 409 });
    }

    // Get manager's branch if the creator is a manager
    let branchId = data.branchId ? parseInt(data.branchId) : null;
    
    if (role === 'MANAGER') {
      const managerBranch = await prisma.branch.findFirst({
        where: { managerId: userId }
      });

      if (!managerBranch) {
        return Response.json({ 
          success: false, 
          error: 'Branch not found',
          message: 'No branch associated with this manager'
        }, { status: 404 });
      }

      // Auto-assign the manager's branch
      branchId = managerBranch.id;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create new user with auto-assigned branch for managers
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        password: hashedPassword,
        role: role === 'MANAGER' ? 'EMPLOYEE' : (data.role || 'EMPLOYEE'), // Managers can only create EMPLOYEES
        status: data.status || 'ACTIVE',
        branchId: branchId, // Use the determined branchId
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      }
    });

    return Response.json({ 
      success: true, 
      data: newUser 
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return Response.json({ 
            success: false, 
            error: 'Conflict',
            message: 'User with this email already exists'
          }, { status: 409 });
        case 'P2000':
          return Response.json({ 
            success: false, 
            error: 'Validation error',
            message: 'Input value is too long'
          }, { status: 400 });
        default:
          return Response.json({ 
            success: false, 
            error: 'Database error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Database operation failed'
          }, { status: 400 });
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return Response.json({ 
        success: false, 
        error: 'Validation error',
        message: 'Invalid data format'
      }, { status: 400 });
    }

    return Response.json({ 
      success: false, 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    // Extract user ID from the URL
    const userId = req.url.split('/').pop();
    const data = await req.json();

    // Validate if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!existingUser) {
      return Response.json({ 
        success: false, 
        error: 'Not Found',
        message: 'User not found'
      }, { status: 404 });
    }

    // Prepare update data (excluding sensitive fields)
    const updateData = {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      status: data.status,
      branchId: data.branchId ? parseInt(data.branchId) : null,
    };

    // If password is provided, hash it
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      }
    });

    return Response.json({ 
      success: true, 
      data: updatedUser 
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return Response.json({ 
            success: false, 
            error: 'Conflict',
            message: 'Email already in use'
          }, { status: 409 });
        default:
          return Response.json({ 
            success: false, 
            error: 'Database error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Database operation failed'
          }, { status: 400 });
      }
    }

    return Response.json({ 
      success: false, 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
