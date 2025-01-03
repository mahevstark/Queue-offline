'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, removeAuthToken } from '@/lib/clientAuth';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
const UserContext = createContext();

export function UserProvider({ children }) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchUser() {
        try {
            const token = getAuthToken();
            // console.log('Auth token:', token); // Debug log

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            const response = await fetch('/api/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            // Log the raw response for debugging
            // console.log('Response status:', response.status);
            const responseText = await response.text();
            // console.log('Response text:', responseText);

            // Try to parse the response as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error('Invalid response format from server');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch user data');
            }

            if (data.success && data.data) {
                // console.log('User data:', data.data); // Debug log
                setUser(data.data);
                setError(null);
            } else {
                throw new Error('Invalid user data structure');
            }
        } catch (err) {
            console.error('Error in fetchUser:', err);
            setError(err.message);
            setUser(null);
            removeAuthToken();
            router.push('/login');
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    const logout = async () => {
        try {

            setIsLoading(true);
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Logout failed');
            }

            setUser(null);
            setError(null);
            removeAuthToken();
            router.push('/login');
            return true;
        } catch (err) {
            console.error('Error during logout:', err);
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Add work status management functions
    const updateWorkStatus = async (updates) => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/user/me/work-status', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update work status');
            }

            if (data.success) {
                setUser(prevUser => ({
                    ...prevUser,
                    ...updates
                }));
                return true;
            }
            throw new Error('Failed to update work status');
        } catch (err) {
            console.error('Error updating work status:', err);
            toast.error(err.message);
            return false;
        }
    };

    const startWork = async () => {
        return await updateWorkStatus({
            isWorking: true,
            isOnBreak: false,
            isAvailable: true
        });
    };

    const endWork = async () => {
        return await updateWorkStatus({
            isWorking: false,
            isOnBreak: false,
            isAvailable: false
        });
    };

    const startBreak = async () => {
        return await updateWorkStatus({
            isOnBreak: true,
            isAvailable: false
        });
    };

    const endBreak = async () => {
        return await updateWorkStatus({
            isOnBreak: false,
            isAvailable: true
        });
    };

    // Add license check function
    const checkLicense = async () => {
        if (!user?.id) return;

        try {
            const response = await fetch('/api/check-license', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.id })
            });

            const data = await response.json();

            if (data.shouldLogout) {
                await logout();
                toast.error('Your license has expired. Please login with a valid license.');
            }
        } catch (error) {
            console.error('License check error:', error);
        }
    };

    // Add effect for periodic license checks
    useEffect(() => {
        if (user) {
            if(user.role === 'MANAGER'){
                // Check license every 12 hours
                const licenseCheckInterval = setInterval(() => {
                    checkLicense();
                }, 12 * 60 * 60 * 1000);
                
                return () => clearInterval(licenseCheckInterval);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchUser();
    }, []);

    const value = {
        user,
        setUser,
        isLoading,
        error,
        refreshUser: fetchUser,
        logout,
        startWork,
        endWork,
        startBreak,
        endBreak,
        updateWorkStatus,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};