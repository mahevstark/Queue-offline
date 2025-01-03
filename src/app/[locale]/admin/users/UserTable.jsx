import { 
    ClockIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    EllipsisVerticalIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronUpDownIcon,
    BuildingOfficeIcon 
} from '@heroicons/react/24/outline';
import { 
    ClockIcon as ClockIconSolid,
    PencilSquareIcon as PencilSquareIconSolid,
    TrashIcon as TrashIconSolid
} from '@heroicons/react/24/solid';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTranslations } from 'next-intl';

export function UserTable({ 
    users, 
    onEdit, 
    onDelete, 
    onViewLogs, 
    onSort, 
    sortConfig, 
    userRole 
}) {
    const t = useTranslations('usersPage.table');

    const getSortIcon = (key) => {
        if (!sortConfig) {
            return <ChevronUpDownIcon className="h-4 w-4 ml-1" />;
        }
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' 
                ? <ChevronUpIcon className="h-4 w-4 ml-1" />
                : <ChevronDownIcon className="h-4 w-4 ml-1" />;
        }
        return <ChevronUpDownIcon className="h-4 w-4 ml-1" />;
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => onSort('fullName')}
                    >
                        <div className="flex items-center">
                            {t('headers.name')}
                            {getSortIcon('fullName')}
                        </div>
                    </th>
                    <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => onSort('email')}
                    >
                        <div className="flex items-center">
                            {t('headers.email')}
                            {getSortIcon('email')}
                        </div>
                    </th>
                    <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => onSort('role')}
                    >
                        <div className="flex items-center">
                            {t('headers.role')}
                            {getSortIcon('role')}
                        </div>
                    </th>
                    <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => onSort('status')}
                    >
                        <div className="flex items-center">
                            {t('headers.status')}
                            {getSortIcon('status')}
                        </div>
                    </th>
                    <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => onSort('branch')}
                    >
                        <div className="flex items-center gap-2">
                            {t('headers.branch')}
                            {getSortIcon('branch')}
                        </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('headers.actions')}
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                            {t('noUsers')}
                        </td>
                    </tr>
                ) : (
                users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                                {user.fullName}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                                {user.email}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${
                                  user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-green-100 text-green-800'}`}
                            >
                                {t(`options.role.${user.role}`)}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex border text-xs leading-5 font-semibold rounded-full 
                                ${user.status === 'ACTIVE' 
                                    ? 'border-activeBtn text-activeBtn' 
                                    : 'border-inactiveBtn text-inactiveBtn'}`}
                            >
                                {t(`status.${user.status}`)}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {user.branch ? (
                                <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                        {user.branch.name}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-500 italic">
                                    {t('notAssigned')}
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex justify-end">
                                <Menu as="div" className="relative inline-block text-left">
                                    <div>
                                        <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full hover:bg-gray-100">
                                            <EllipsisVerticalIcon 
                                                className="h-6 w-6"
                                                aria-hidden="true"
                                            />
                                        </Menu.Button>
                                    </div>

                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="absolute right-0 z-[999] mt-2 w-auto origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                            <div className="py-1">
                                                {/* View Logs */}
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => onViewLogs(user.id)}
                                                            className={`
                                                                ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}
                                                                group flex w-full items-center px-4 py-2 text-sm
                                                            `}
                                                        >
                                                            {active ? (
                                                                <ClockIconSolid className="mr-3 h-5 w-5 text-gray-500" />
                                                            ) : (
                                                                <ClockIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                            )}
                                                            {t('actions.viewLogs')}
                                                        </button>
                                                    )}
                                                </Menu.Item>

                                                {/* Edit User */}
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => onEdit(user)}
                                                            className={`
                                                                ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}
                                                                group flex w-full items-center px-4 py-2 text-sm
                                                            `}
                                                        >
                                                            {active ? (
                                                                <PencilSquareIconSolid className="mr-3 h-5 w-5 text-gray-500" />
                                                            ) : (
                                                                <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                            )}
                                                            {t('actions.edit')}
                                                        </button>
                                                    )}
                                                </Menu.Item>

                                                {/* Delete User */}
                                                {(userRole === 'SUPERADMIN' || userRole === 'MANAGER') && (
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <button
                                                                onClick={() => onDelete(user)}
                                                                className={`
                                                                    ${active ? 'bg-red-50 text-red-900' : 'text-red-700'}
                                                                    group flex w-full items-center px-4 py-2 text-sm
                                                                `}
                                                            >
                                                                {active ? (
                                                                    <TrashIconSolid className="mr-3 h-5 w-5 text-red-500" />
                                                                ) : (
                                                                    <TrashIcon className="mr-3 h-5 w-5 text-red-400" />
                                                                )}
                                                                {t('actions.delete')}
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                )}
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                        </td>
                    </tr>
                ))
            )}
            </tbody>
        </table>
    );
}

function canDelete(userRole, targetRole) {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'MANAGER' && targetRole === 'EMPLOYEE') return true;
    return false;
}