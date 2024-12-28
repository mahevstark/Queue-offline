import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from "@/middleware/authMiddleware";

// GET all branches
export async function GET(req) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    // First, get all active branch services
    const branchServicesData = await prisma.branchService.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        service: {
          include: {
            subServices: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    // Then get branches with basic info
    const branches = await prisma.branch.findMany({
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        employees: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        desks: true,
      },
    });

    // Transform and combine the data
    const transformedBranches = branches.map(branch => {
      const branchServices = branchServicesData.filter(bs => bs.branchId === branch.id);
      
      return {
        ...branch,
        services: branchServices.map(bs => bs.service),
        serviceCount: branchServices.length,
        subServiceCount: branchServices.reduce((acc, bs) => 
          acc + (bs.service.subServices?.length || 0), 0
        ),
      };
    });

    console.log('Transformed branches with services:', 
      transformedBranches.map(b => ({
        id: b.id,
        name: b.name,
        serviceCount: b.serviceCount,
        subServiceCount: b.subServiceCount
      }))
    );

    return NextResponse.json({
      success: true,
      data: transformedBranches
    });

  } catch (error) {
    console.error('Failed to fetch branches:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch branches',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST new branch
export async function POST(request) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // Only allow ADMIN and SUPERADMIN to create branches
    const { role } = authResult;
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, city, state, zipCode, phone, managerId, status } = body;

    // Validate required fields
    const requiredFields = { name, address, city, state, zipCode, phone };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value?.trim())
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate branch name
    const existingBranch = await prisma.branch.findFirst({
      where: { name: name.trim() }
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: 'A branch with this name already exists' },
        { status: 409 }
      );
    }

    // Use a transaction to handle both branch creation and manager update
    const branch = await prisma.$transaction(async (prisma) => {
      // If a manager is being assigned, update their previous branch (if any)
      if (managerId) {
        // Clear previous manager assignment
        await prisma.branch.updateMany({
          where: { managerId: parseInt(managerId) },
          data: { managerId: null }
        });
      }

      // Create the new branch
      const newBranch = await prisma.branch.create({
        data: {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          phone: phone.trim(),
          managerId: managerId ? parseInt(managerId) : null,
          status: status || 'ACTIVE',
        },
        include: {
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // After creating the branch, assign the branchId to the manager
      if (managerId) {
        await prisma.user.update({
          where: { id: managerId },
          data: { branchId: newBranch.id } // Set the branchId to the newly created branch
        });
      }

      return newBranch; // Return the newly created branch
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create branch' },
      { status: 500 }
    );
  }
}