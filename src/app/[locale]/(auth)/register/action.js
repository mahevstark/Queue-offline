'use server'
import prisma  from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function registerUser(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        fullName: name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: 'An error occurred during registration. Please try again.' 
    };
  }
}