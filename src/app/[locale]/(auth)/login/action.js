'use server'
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/serverAuth';

export async function loginUser(formData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find user with managed branch information
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        role: true,
        status: true,
        managedBranch: {
          select: {
            id: true
          }
        },
        branch: {
          select: {
            id: true
          }
        },
        assignedDesk: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Set branchId based on role
    const branchId = user.role === 'MANAGER' 
      ? user.managedBranch?.id 
      : user.branch?.id;

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      branchId: branchId || null,
      assignedDeskId: user.assignedDesk?.id || null
    };


    const token = createToken(tokenPayload);
    if (!token) {
      throw new Error('Failed to create authentication token');
    }

    await setAuthCookie(token);

    return {
      success: true,
      data: {
        id: user.id,
        role: user.role,
        name: user.fullName,
        email: user.email,
        branchId: branchId || null,
        assignedDeskId: user.assignedDesk?.id || null
      }
    };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}