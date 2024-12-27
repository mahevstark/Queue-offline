'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import branchService  from '@/services/branchService';
import userService  from '@/services/userService';
import EmployeeList from '@/components/admin/branches/EmployeeList';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useTranslations } from 'next-intl';
export default function BranchEmployeesPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('branchEmployees');

    const branchId = params?.branchId;
    
    const [branch, setBranch] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!branchId) {
            toast.error('Invalid branch ID');
            router.push('/admin/branches');
            return;
        }
        
        try {
            setLoading(true);
            
            // Load branch data
            const branchData = await branchService.getBranch(branchId);
            if (!branchData) {
                throw new Error('Failed to load branch data');
            }
            
            // Filter out managers from employees list
            const nonManagerEmployees = branchData.employees?.filter(emp => emp.role !== 'MANAGER') || [];
            setBranch(branchData);
            setEmployees(nonManagerEmployees);
            
            // Load users data
            const allUsers = await userService.getUsers();
            if (!allUsers) {
                throw new Error('Failed to load users data');
            }
            
            // Filter available employees (excluding managers)
            const available = allUsers.filter(user => 
                !user.branchId && 
                user.status === 'ACTIVE' &&
                user.role !== 'MANAGER' &&
                !branchData.employees?.some(emp => emp.id === user.id)
            );
            setAvailableEmployees(available);
          
            
        } catch (err) {
            toast.error(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [branchId]);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container mx-auto px-4 bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)]" >
            <div className="flex justify-between items-center mb-6">
                
                <button
                    onClick={() => router.back()}
                    className="text-white rounded-[50%] bg-primaryOrange px-2 py-1 hover:bg-primaryOrangeHover"
                >
                    ← 
                </button>
                <h3 className="text-xl font-semibold text-primaryGreen mx-auto">{t('title')}</h3>
            </div>
            
            <EmployeeList
                branchId={branchId}
                employees={employees}
                availableEmployees={availableEmployees}
                onEmployeeUpdate={loadData}
                branchName={branch?.name || ''}
            />
        </div>
    );
}