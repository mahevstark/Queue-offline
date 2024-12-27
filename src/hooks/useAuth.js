'use client'
import { useEffect, useState, useCallback, useRef } from 'react';
import { getAuthToken } from '@/lib/clientAuth';
import { jwtDecode } from "jwt-decode";
import { fetchWithAuth } from '@/lib/apiUtils';

const TOKEN_EXPIRY_BUFFER = 60;

export function useAuth() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const initialized = useRef(false);

    const validateToken = useCallback((token) => {
        if (!token) {
            return null;
        }
        try {
            const decoded = jwtDecode(token);
            
            if (!decoded?.exp) {
                return null;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp < (currentTime + TOKEN_EXPIRY_BUFFER)) {
                return null;
            }

            // Required fields that must have values
            const requiredFields = ['id', 'email', 'name', 'role'];
            const hasRequiredFields = requiredFields.every(field => decoded[field]);
            if (!hasRequiredFields) {
            
                return null;
            }

          
            return decoded;
        } catch (error) {
            return null;
        }
    }, []);

    const initializeAuth = useCallback(async () => {
        if (!initialized.current) {
            initialized.current = true;
        }

        try {
            const token = getAuthToken();
            const decoded = token ? validateToken(token) : null;

            if (decoded) {
                setUser({
                    id: decoded.id,
                    email: decoded.email,
                    name: decoded.name,
                    role: decoded.role,
                    tokenExpiry: decoded.exp,
                    branchId: decoded.branchId || null,
                    assignedDeskId: decoded.assignedDeskId || null
                });
            } else {
                setUser(null);
            }
            setError(null);
        } catch (err) {
            console.error('Auth initialization error:', err);
            setUser(null);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [validateToken]);

    useEffect(() => {
        // Only run initialization once on mount
        if (!initialized.current) {
            initializeAuth();
        }

        const intervalId = setInterval(() => {
            if (initialized.current) {
                initializeAuth();
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [initializeAuth]);

    const logout = useCallback(() => {
        setUser(null);
        setError(null);
        // Add your logout logic here
        // localStorage.removeItem('authToken');
    }, []);

    const refresh = useCallback(() => {
        return initializeAuth();
    }, [initializeAuth]);

    const forgotPassword = useCallback(async (email) => {
        return await fetchWithAuth('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
           
    }, []);

    const resetPassword = useCallback(async (token, newPassword) => {
        
            return await fetchWithAuth('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            
    }, []);

    // Development logging
    if (process.env.NODE_ENV === 'development') {
        useEffect(() => {
            if (initialized.current) {
            }
        }, [user, isLoading, error]);
    }

    return {
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        logout,
        refresh,
        forgotPassword,
        resetPassword
    };
}

// Add default export
export default useAuth;