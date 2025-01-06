import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyToken } from '@/lib/authService';

const JWT_SECRET = 'd7ac385848b71c3131f75cd0fcd8956d9280a575425fa131b30ccb4c4e161ce5';
const TOKEN_NAME = 'auth_token';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managedBranchId: user.managedBranchId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.managedBranchId = user.managedBranchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.managedBranchId = token.managedBranchId;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // 1 year instead of 24 hours
  },
  pages: {
    signIn: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: 'd7ac385848b7176876831f75cd0fcd8956d9280a575425fa131b30ccb4c4e161ce5',
};

export const createToken = (payload) => {
  try {
    console.log('Creating token with payload:', payload);
    const token = jwt.sign({
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      branchId: payload.branchId,
      assignedDeskId: payload.assignedDeskId
    }, JWT_SECRET, {
      expiresIn: '365d' // 1 year instead of 24h
    });
    return token;
  } catch (error) {
    console.error('Token creation error:', error);
    return null;
  }
};

export const setAuthCookie = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided for cookie setting');
    }

    const cookieStore = cookies();
    cookieStore.set(TOKEN_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year instead of 24 hours
      path: '/'
    });

    console.log('Auth cookie set successfully');
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    throw error;
  }
};

export const getServerAuthToken = () => {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_NAME);
    return token?.value || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const removeAuthCookie = async () => {
  const cookieStore = await cookies();
  await cookieStore.delete(TOKEN_NAME);
};

export const isAuthenticated = () => {
  try {
    const token = getServerAuthToken();
    if (!token) {
      console.log('No token found');
      return false;
    }
    
    const decoded = verifyToken(token);
    console.log('Token verification result:', !!decoded);
    return !!decoded;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
};