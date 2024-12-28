import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, context) {
    try {
        const branchId = context.params.branchId;
        
        const branch = await prisma.branch.findUnique({
            where: { id: parseInt(branchId) },
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
                        status: true,
                        assignedDeskId: true
                    },
                },
            },
        });

        if (!branch) {
            return NextResponse.json(
                { error: 'Branch not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(branch);
    } catch (error) {
        console.error('Error fetching branch:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branch' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
  try {
    const { branchId } = params;
    const body = await request.json();
    const { name, address, city, state, zipCode, phone, managerId, status } = body;

    const branch = await prisma.$transaction(async (prisma) => {
      if (managerId) {
        await prisma.branch.updateMany({
          where: { 
            managerId: parseInt(managerId),
            NOT: { id: parseInt(branchId) }
          },
          data: { managerId: null }
        });
      }

      return await prisma.branch.update({
        where: { id: parseInt(branchId) },
        data: {
          name: name?.trim(),
          address: address?.trim(),
          city: city?.trim(),
          state: state?.trim(),
          zipCode: zipCode?.trim(),
          phone: phone?.trim(),
          managerId: managerId ? parseInt(managerId) : null,
          status: status || undefined,
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
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { branchId } = params;
    await prisma.branch.delete({
      where: { id: parseInt(branchId) },
    });

    return NextResponse.json(
      { message: 'Branch deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}