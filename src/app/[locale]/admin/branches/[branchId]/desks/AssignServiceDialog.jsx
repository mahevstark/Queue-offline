'use client';
import { useState, useEffect, useCallback } from 'react';
import branchService from '@/services/branchService';
import deskService from '@/services/deskService';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function AssignServicesDialog({ open, onClose, desk, branchId, onAssign }) {
    const [loading, setLoading] = useState(false);
    const [branchServices, setBranchServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedSubServices, setSelectedSubServices] = useState([]);
    const [activeTab, setActiveTab] = useState('services');

    const loadBranchServices = useCallback(async () => {
        try {
            setLoading(true);
            const response = await branchService.getBranchServices(branchId);
            setBranchServices(response.data || []);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (open && desk) {
            loadBranchServices();
            setSelectedServices(desk.services?.map(s => s.service.id) || []);
            setSelectedSubServices(desk.subServices?.map(s => s.subService.id) || []);
        }
    }, [open, desk, branchId, loadBranchServices]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await Promise.all([
                deskService.assignServices(branchId, desk.id, selectedServices),
                deskService.assignSubServices(branchId, desk.id, selectedSubServices)
            ]);
            toast.success('Services assigned successfully');
            onAssign();
            onClose();
        } catch (error) {
            toast.error('Failed to assign services');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;
    if (loading) return <LoadingSpinner />;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <Card className="w-full max-w-[600px]">
                <CardHeader>
                    <CardTitle>Assign Services to Desk</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="services">Services</TabsTrigger>
                            <TabsTrigger value="subservices">Sub-Services</TabsTrigger>
                        </TabsList>

                        <TabsContent value="services">
                            <div className="space-y-3">
                                {branchServices.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No available services</p>
                                ) : (
                                    branchServices.map(bs => (
                                        <div key={bs.service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`service-${bs.service.id}`}
                                                        checked={selectedServices.includes(bs.service.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedServices([...selectedServices, bs.service.id]);
                                                            } else {
                                                                setSelectedServices(selectedServices.filter(id => id !== bs.service.id));
                                                            }
                                                        }}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <label htmlFor={`service-${bs.service.id}`} className="flex-1">
                                                        <span className="font-medium">{bs.service.name}</span>
                                                    </label>
                                                </div>
                                                <div className="mt-1 ml-6">
                                                    <span className="text-sm text-gray-500">
                                                        {bs.service.subServices?.length || 0} sub-services
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`text-sm px-3 py-1 ${bs.service.status === 'ACTIVE' ? 'bg-activeBtn text-white' : 'bg-inactiveBtn text-white'} rounded-lg`}>
                                                {bs.service.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="subservices">
                            <div className="space-y-3">
                                {branchServices.flatMap(bs => 
                                    bs.service.subServices?.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`subservice-${sub.id}`}
                                                    checked={selectedSubServices.includes(sub.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSubServices([...selectedSubServices, sub.id]);
                                                        } else {
                                                            setSelectedSubServices(selectedSubServices.filter(id => id !== sub.id));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300"
                                                />
                                                <label htmlFor={`subservice-${sub.id}`} className="flex-1">
                                                    <span className="font-medium">{sub.name}</span>
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        (Part of {bs.service.name})
                                                    </span>
                                                </label>
                                            </div>
                                            <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'secondary'}>
                                                {sub.status}
                                            </Badge>
                                        </div>
                                    ))
                                ).filter(Boolean)}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}