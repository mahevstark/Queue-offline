import Cookies from 'js-cookie';

const TOKEN_NAME = 'auth_token';

export const getAuthToken = () => {
    try {
        const token = Cookies.get(TOKEN_NAME);
        return token || null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

export const setAuthToken = (token) => {
    try {
        Cookies.set(TOKEN_NAME, token, {
            path: '/',
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
        });
    } catch (error) {
        console.error('Error setting auth token:', error);
    }
};

export const removeAuthToken = () => {
    try {
        Cookies.remove(TOKEN_NAME, { path: '/' });
    } catch (error) {
        console.error('Error removing auth token:', error);
    }
};