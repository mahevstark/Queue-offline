import React from 'react';
import Sidebar from './Sidebar';

const AdminLayout = ({ children }) => {
    return (
        <div className="flex">
            <Sidebar />
            <div className="ml-12 w-full p-8">
                {children}
            </div>
        </div>
    );
};

export default AdminLayout;