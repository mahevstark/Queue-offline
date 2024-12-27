'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import Sidebar from '@/app/components/layout/Sidebar';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    UserCircleIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Add SidebarContext to manage sidebar state globally
const SidebarContext = React.createContext();

export function useSidebar() {
    return React.useContext(SidebarContext);
}

async function getBranchName(branchId) {
    try {
        const response = await fetch(`/api/branches/${branchId}`);
        const data = await response.json();
        return data.name ? data.name : null;
    } catch (error) {
        console.error('Error fetching branch name:', error);
        return null;
    }
}

function getPageTitle(pathname, user) {
    // Remove locale prefix and leading slash
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '');
    const parts = pathWithoutLocale.split('/');

    // Handle root path
    if (!parts[0]) return 'Home';

    // Handle token-related paths - replace "token" with "interval"
    const formattedParts = parts.map(part => {
        if (part === 'token-series') return 'Interval Series';
        if (part === 'token-generation') return 'Interval Generation';
        if (part === 'tokens') return 'Intervals';
        if (part === 'token') return 'Interval';
        return part;
    });

    // Handle admin routes
    if (parts[0] === 'admin') {
        // Special case for branches page based on user role
        if (parts[1] === 'branches' && !parts[2]) {
            return user?.role === 'SUPERADMIN' ? 'Branches' : 'My Branch';
        }
        
        // Special case for users page to show different titles based on role
        if (parts[1] === 'users') {
            return user?.role === 'SUPERADMIN' ? 'Users' : 'Employees';
        }

        // Check if it's a branch-related page
        if (parts[1] === 'branches' && parts[2]) {
            switch (parts[3]) {
                case 'edit':
                    return 'Edit'; // Will be updated by useEffect
                case 'desks':
                    return 'Manage Desks';
                case 'employees':
                    return 'Manage Employees';
                case 'services':
                    return 'Manage Services';
                case 'token-series':
                    return 'Interval Series';
                default:
                    return 'Branch Details';
            }
        }

        // Handle other admin routes - skip the 'admin' part
        return formattedParts
            .slice(1) // Skip 'admin'
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' / ');
    }

    // Handle special cases
    switch (parts[0]) {
        case 'dashboard':
            return 'Dashboard';
        case 'employee-dashboard':
            return 'Employee Dashboard';
        case 'user-logs':
            return 'User Logs';
        default:
            // Capitalize each part of the path
            return formattedParts
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' / ');
    }
}

function UserMenu() {
    const { user, logout } = useUser();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            const success = await logout();
            if (success) {
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (!user) {
        return (
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="px-4 py-2 text-green-600 hover:text-green-700 font-medium"
                >
                    Login
                </Link>
                <Link
                    href="/register"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                    Sign Up
                </Link>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <UserCircleIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                <span className="text-gray-700 dark:text-gray-200">{user.fullName}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[100%] bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            handleLogout();
                        }}
                        className="flex items-center gap-2 px-4 py-2 w-full text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

function Header() {
    const { user, isLoading } = useUser();
    const { expanded } = useSidebar();
    const pathname = usePathname();
    const [title, setTitle] = useState(getPageTitle(pathname, user));

    useEffect(() => {
        const updateTitle = async () => {
            const parts = pathname.slice(1).split('/');

            // Check if we're on a branch edit page
            if (parts[0] === 'admin' && parts[1] === 'branches' && parts[3] === 'edit') {
                const branchId = parts[2];
                const branchName = await getBranchName(branchId);
                console.log(branchName)
                if (branchName) {
                    setTitle(`${branchName} / Edit`);
                } else {
                    setTitle('Edit Branch');
                }
            } else if (parts[0] === 'admin' && parts[1] === 'branches' && parts[3] === 'desks') {
                const branchId = parts[2];
                const branchName = await getBranchName(branchId);
                console.log(branchName)
                if (branchName) {
                    setTitle(`${branchName} / Desks`);
                } else {
                    setTitle('Desks');
                }
            }
            else if (parts[0] === 'admin' && parts[1] === 'branches' && parts[3] === 'employees') {
                const branchId = parts[2];
                const branchName = await getBranchName(branchId);
                console.log(branchName)
                if (branchName) {
                    setTitle(`${branchName} / Employees`);
                } else {
                    setTitle('Employees');
                }
            }
            else if (parts[0] === 'admin' && parts[1] === 'branches' && parts[3] === 'services') {
                const branchId = parts[2];
                const branchName = await getBranchName(branchId);
                console.log(branchName)
                if (branchName) {
                    setTitle(`${branchName} / Services`);
                } else {
                    setTitle('Services');
                }
            }
            else {
                setTitle(getPageTitle(pathname, user));
            }
        };

        updateTitle();
    }, [pathname, user]);

    // Don't show header on auth pages or when user is not logged in
    const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
    if (isAuthPage || !user) return null;

    return (
        <header
            className={`fixed top-0 right-0 z-10 shadow-sm bg-background dark:bg-gray-800 px-6 py-4 flex justify-between items-center transition-all duration-300
                ${expanded ? 'left-64' : 'left-20'}`}
        >
            <h1 className="text-xl font-semibold text-primaryGreen dark:text-white capitalize">
                {title}
            </h1>
            <div className="flex items-center gap-4">
                <LanguageSwitcher />
                {isLoading ? (
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                    <UserMenu />
                )}
            </div>
        </header>
    );
}

export default function ClientLayout({ children }) {
    const { user, logout, isLoading } = useUser();
    const [expanded, setExpanded] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    
    // Get the path without locale for comparison
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '');

    const handleLogout = async () => {
        try {
            const success = await logout();
            if (success) {
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Update excluded routes to handle localized paths
    const excludeLayoutRoutes = [
        '/login',
        '/register',
        '/reset-password',
        '/display-screen',
        '/desk-screen',
        // Add any path that includes 'token-generation'
        ...pathWithoutLocale.match(/.*token-generation.*/) ? [pathWithoutLocale] : []
    ];

    // Update the check to use pathWithoutLocale
    const shouldExcludeLayout = 
        excludeLayoutRoutes.some(route => 
            pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
        );

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    // Return just the children for excluded routes
    if (shouldExcludeLayout) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                {children}
            </div>
        );
    }

    // Main application layout
    return (
        <SidebarContext.Provider value={{ expanded, setExpanded }}>
            <div className="flex min-h-screen bg-background dark:bg-gray-900">
                {user && ( // Only show sidebar if user is logged in
                    <div className="fixed left-0 z-50 top-0 h-full">
                        <Sidebar handleLogout={handleLogout}/>
                    </div>
                )}
                <div className={`flex-1 transition-all duration-300 ${user && expanded ? 'ml-64' : user ? 'ml-20' : ''}`}>
                    <Header />
                    <main className={`flex-1 p-6 space-y-6 ${user ? 'mt-16' : ''}`}>
                        {children}
                    </main>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
