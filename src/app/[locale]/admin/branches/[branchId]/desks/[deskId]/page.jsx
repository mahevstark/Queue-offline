'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import deskService from '@/services/deskService';
import branchService from '@/services/branchService';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    UserGroupIcon, 
    WrenchScrewdriverIcon,
    ChartBarIcon,
    InformationCircleIcon,
    ArrowLeftIcon,
    UserPlusIcon,
    UserMinusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignEmployeesDialog from '../AssignEmployeeDialog';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { ApiError } from '@/lib/apiUtils';
import { useTranslations } from 'next-intl';

export default function DeskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('deskDetail');
    const [desk, setDesk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAssignEmployeesOpen, setIsAssignEmployeesOpen] = useState(false);
    const [branchEmployees, setBranchEmployees] = useState([]);
    const [employeeToRemove, setEmployeeToRemove] = useState(null);

    useEffect(() => {
        loadDeskData();
        loadBranchEmployees();
    }, []);

    const loadDeskData = async () => {
        try {
            setLoading(true);
            const data = await deskService.getDesk(
                parseInt(params.branchId), 
                parseInt(params.deskId)
            );
            
            if (!data) {
                console.error('Failed to load desk details');
                toast.error(t('notifications.loadError'));
            }

            setDesk({
                ...data,
                employees: data.employees || [],
                services: data.deskServices?.map(ds => ({
                    id: ds.id,
                    name: ds.service.name,
                    status: ds.status
                })) || [],
                subServices: data.deskSubServices?.map(dss => ({
                    id: dss.id,
                    name: dss.subService.name,
                    status: dss.status
                })) || []
            });
        } catch (error) {
            console.error('Error loading desk:', error);
            toast.error(t('notifications.loadError'));
            router.push(`/admin/branches/${params.branchId}/desks`);
        } finally {
            setLoading(false);
        }
    };

    const loadBranchEmployees = async () => {
        try {
            const response = await branchService.getBranch(params.branchId);
            setBranchEmployees(response.employees || []);
        } catch (error) {
            console.error('Error loading branch employees:', error);
            toast.error(t('notifications.branchEmployeesError'));
        }
    };

    const handleAssignEmployees = async (employeeIds) => {
        try {

            await deskService.assignEmployeesToDesk(
                parseInt(params.branchId), 
                parseInt(params.deskId), 
                employeeIds
            );

            await loadDeskData(); // Reload desk data
            toast.success(t('notifications.employeeAssigned'));
            return true;
        } catch (error) {
            console.error('Error assigning employees:', error);
            toast.error(t('notifications.employeeAssignError'));
            return false;
        }
    };

    const handleRemoveEmployee = async () => {
        if (!employeeToRemove) return;
        
        try {
            await deskService.removeEmployeeFromDesk(
                parseInt(params.branchId),
                parseInt(params.deskId),
                employeeToRemove.id
            );
            
            await loadDeskData();
            toast.success(t('notifications.employeeRemoved'));
        } catch (error) {
            console.error('Error removing employee:', error);
            const errorMessage = error instanceof ApiError 
                ? error.message 
                : t('notifications.employeeRemoveError');
            toast.error(errorMessage);
        } finally {
            setEmployeeToRemove(null);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!desk) return <div>{t('notifications.noDesk')}</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 bg-white">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => router.push(`/admin/branches/${params.branchId}/desks`)}
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{desk.displayName}</h1>
                        <p className="text-sm text-gray-500">{t('title')}</p>
                    </div>
                </div>
                
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white p-1 rounded-lg shadow-sm gap-1">
                    <TabsTrigger 
                        value="overview" 
                        className="data-[state=active]:bg-white data-[state=active]:border-primaryGreen data-[state=active]:text-primaryGreen border border-gray-300"
                    >
                        <InformationCircleIcon className="h-5 w-5" />
                        {t('tabs.overview')}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="services" 
                        className="data-[state=active]:bg-white data-[state=active]:border-primaryGreen data-[state=active]:text-primaryGreen border border-gray-300"
                    >
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                        {t('tabs.services')}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="employees" 
                        className="data-[state=active]:bg-white data-[state=active]:border-primaryGreen data-[state=active]:text-primaryGreen border border-gray-300"
                    >
                        <UserGroupIcon className="h-5 w-5" />
                        {t('tabs.employees')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle>{t('overview.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-500">{t('overview.fields.name')}</h3>
                                <p className="text-base font-medium">{desk.name}</p>
                            </div>
                            <div className="space-y-2 flex flex-col items-start  justify-center">
                                <h3 className="text-sm font-medium text-gray-500">{t('overview.fields.status')}</h3>
                                <span 
                                    className={`text-sm px-3 py-1 ${desk.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}
                                >
                                {t(`status.${desk.status}`)}
                            </span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-500">{t('overview.fields.totalEmployees')}</h3>
                                <p className="text-base font-medium">{desk.employeeCount}</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-500">{t('overview.fields.totalServices')}</h3>
                                <p className="text-base font-medium">{desk.services.length}</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-500">{t('overview.fields.totalSubServices')}</h3>
                                <p className="text-base font-medium">{desk.subServices.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="services">
                    <div className="grid gap-6">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b">
                                <CardTitle>{t('services.mainServices.title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {desk.services.map((service) => (
                                        <div key={service.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{service.name}</span>
                                                <span className={`text-sm px-3 py-1 ${service.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}>
                                                    {t(`status.${service.status}`)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="border-b">
                                <CardTitle>{t('services.subServices.title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {desk.subServices.map((subService) => (
                                        <div key={subService.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{subService.name}</span>
                                                <span className={`text-sm px-3 py-1 ${subService.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}>
                                                    {t(`status.${subService.status}`)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="employees">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b flex justify-between items-center">
                            <CardTitle>{t('employees.title')}</CardTitle>
                            <Button
                                onClick={() => setIsAssignEmployeesOpen(true)}
                                className="flex items-center bg-primaryOrange text-white gap-2 border border-gray-300 p-2 rounded-lg hover:bg-primaryOrangeHover"
                            >
                                <UserPlusIcon className="h-5 w-5" />
                                {t('employees.buttons.assign')}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                {desk?.employees?.length === 0 ? (
                                    <p className="col-span-full text-center text-gray-500 py-4">
                                        {t('employees.noEmployees')}
                                    </p>
                                ) : (
                                    desk?.employees?.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{employee.fullName}</p>
                                                        <p className="text-sm text-gray-500">{employee.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm px-3 py-1 ${employee.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}>
                                                            {t(`status.${employee.status}`)}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600  hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setEmployeeToRemove(employee)}
                                                        >
                                                            <UserMinusIcon className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AssignEmployeesDialog
                open={isAssignEmployeesOpen}
                onClose={() => setIsAssignEmployeesOpen(false)}
                desk={desk}
                branchEmployees={branchEmployees}
                onAssign={handleAssignEmployees}
            />

            <ConfirmationModal
                isOpen={!!employeeToRemove}
                onClose={() => setEmployeeToRemove(null)}
                onConfirm={handleRemoveEmployee}
                title={t('modal.title')}
                message={t('modal.message', { name: employeeToRemove?.fullName })}
                confirmText={t('modal.confirmButton')}
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            />
        </div>
    );
}