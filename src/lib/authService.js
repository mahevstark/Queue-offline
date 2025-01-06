import jwt from 'jsonwebtoken';

const JWT_SECRET = "d7ac385848b71c3131f75cd0fcd8956d9280a575425fa131b30ccb4c4e161ce5";

export const verifyToken = (token) => {
  try {
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token in verifyToken:', decoded);
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      branchId: decoded.branchId,
      assignedDeskId: decoded.assignedDeskId
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Re-export client auth methods
export {
  getAuthToken,
  setAuthToken,
  removeAuthToken
} from './clientAuth';