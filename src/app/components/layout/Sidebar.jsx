'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from '@/app/[locale]/ClientLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import {
    HomeIcon,
    BuildingOffice2Icon,
    UsersIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    UserCircleIcon,
    CalculatorIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import { ComputerIcon, LogOutIcon, ScreenShare } from 'lucide-react';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/solid';

export default function Sidebar({ handleLogout }) {
    const pathname = usePathname();
    const { expanded, setExpanded } = useSidebar();
    const { user } = useAuth();
    const t = useTranslations('sidebar');

    // Define navigation items with role restrictions
    const navigationItems = [
        { 
            name: t('navigation.dashboard'), 
            href: '/dashboard', 
            Icon: HomeIcon,
            roles: ['MANAGER']
        },
        { 
            name: t('navigation.users'), 
            href: '/admin/users', 
            Icon: UsersIcon,
            roles: ['SUPERADMIN'],
            isActive: (path) => path.includes('/admin/users') || path.includes('/admin/user-logs')
        },
        { 
            name: t('navigation.employees'), 
            href: '/admin/users', 
            Icon: UsersIcon,
            roles: ['MANAGER'],
            isActive: (path) => path.includes('/admin/users') || path.includes('/admin/user-logs')
        },
        { 
            name: t('navigation.services'), 
            href: '/admin/services', 
            Icon: WrenchScrewdriverIcon,
            roles: ['SUPERADMIN', 'MANAGER']
        },
        {
            name: t('navigation.displayScreen'),
            href: '/display-screen',
            Icon: ScreenShare,
            roles: [ 'SUPERADMIN', 'MANAGER']
        },
        {
            name: t('navigation.employeeDashboard'),
            href: '/employee-dashboard',
            Icon: UserCircleIcon,
            roles: ['EMPLOYEE'],
        },
        {
            name: t('navigation.deskScreens'),
            href: '/desk-screens',
            Icon: ComputerIcon,
            roles: ['SUPERADMIN', 'MANAGER'],
        },
        {
            name: t('navigation.numerators'),
            href: '/numerators',
            Icon: CalculatorIcon,
            roles: ['SUPERADMIN', 'MANAGER']
        }
    ];

    // Get branch navigation item based on user role
    const getBranchNavItem = () => {
        if (user?.role === 'SUPERADMIN') {
            return {
                name: t('navigation.branches'),
                href: '/admin/branches',
                Icon: MapPinIcon,
                roles: ['SUPERADMIN']
            };
        } else if (user?.role === 'MANAGER') {
            return {
                name: t('navigation.myBranch'),
                href: '/admin/branches',
                Icon: BuildingOffice2Icon,
                roles: ['MANAGER']
            };
        }
        return null;
    };

    // Filter navigation items based on user role and add branch item
    const authorizedNavigation = [
        ...navigationItems.filter(item => 
            user?.role && item.roles.includes(user.role)
        )
    ];

    // Insert branch item after Dashboard if it exists
    const branchItem = getBranchNavItem();
    if (branchItem) {
        authorizedNavigation.splice(1, 0, branchItem);
    }

    return (
        <aside 
            className={`${
                expanded ? 'w-64' : 'w-20'
            } bg-primaryGreen z-[999] rounded-r-xl text-white flex flex-col h-screen transition-all duration-300`}
        >
            {/* Logo Section */}
            <div className={`p-6 text-lg font-bold flex items-center justify-between`}>
                {expanded && <span>{t('title')}</span>}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-1.5 rounded-lg bg-primaryOrange hover:bg-primaryOrangeHover transition-colors"
                >
                    {expanded ? (
                        <ChevronLeftIcon className="h-5 w-5" />
                    ) : (
                        <ChevronRightIcon className="h-5 w-5" />
                    )}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 overflow-y-auto">
                <ul>
                    {authorizedNavigation.map((item) => {
                        const isActive = item.isActive 
                            ? item.isActive(pathname)
                            : pathname.includes(item.href) && item.href !== '/';
                        
                        const Icon = item.Icon;
                        
                        return (
                            <li key={item.name} className="py-1">
                                <Link 
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                                        !expanded && 'justify-center'
                                    } ${
                                        isActive 
                                            ? 'bg-primaryOrange text-white font-medium' 
                                            : 'text-white/80 hover:bg-primaryGreenHover hover:text-white'
                                    }`}
                                    title={!expanded ? item.name : ''}
                                >
                                    <Icon className={`h-5 w-5 ${expanded ? 'mr-3' : 'mr-0'} ${
                                        isActive ? 'text-white' : 'text-white/80'
                                    }`} />
                                    {expanded && <span>{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}

                    <li>
                        <hr className="border-gray-100/20 my-3" />
                        <button 
                            onClick={handleLogout} 
                            className={`flex items-center rounded-lg px-4 py-3 w-full transition-colors
                                ${!expanded && 'justify-center'}
                                text-white/80 hover:bg-primaryGreenHover hover:text-white`}
                        >
                            <LogOutIcon className="h-5 w-5" />
                            {expanded && <span className="ml-2">{t('logout')}</span>}
                        </button>
                    </li>
                </ul>
            </nav>

            {/* User Profile Section */}
            {user && (
                <div className="px-4 py-4 border-t border-primaryGreen">
                    <div className={`flex items-center ${!expanded && 'justify-center'}`}>
                        <UserCircleIcon className={`h-6 w-6 ${expanded ? 'mr-3' : 'mr-0'}`} />
                        {expanded && (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{user.name}</span>
                                <span className="text-xs text-white/70">{t(`userRole.${user.role}`)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}