'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';
import tokenService from '@/services/tokenService';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import logo from '@/assests/white.png';
// Custom Modal Component
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black opacity-30"
                    onClick={onClose}
                ></div>

                {/* Modal Content */}
                <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl ">
                    {children}
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner = () => {
    const t = useTranslations('tokenGeneration');
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primaryOrange"></div>
            <p className="mt-4 text-white text-lg">{t('loading')}</p>
        </div>
    );
};

const printToken = (token, t) => {
    const printWindow = window.open('', '', 'width=300,height=400');
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Token ${token.displayNumber}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @media screen, print {
                    @page {
                        margin: 0 !important;
                        size: 80mm auto !important;
                    }

                    body {
                        font-family: Arial, sans-serif;
                        width: 80mm;
                        margin: 0 auto;
                        padding: 0;
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 0 auto;
                        line-height: 1.4em;
                    }

                    td {
                        font-size: 12px;
                        padding: 5px 0;
                    }

                    .bold {
                        font-weight: bold;
                    }

                    .large {
                        font-size: 16px;
                    }

                    .extra-large {
                        font-size: 32px;
                        font-weight: bold;
                    }

                    .small {
                        font-size: 10px;
                    }

                    .divider {
                        border-top: 1px dashed black;
                        margin: 10px 0;
                    }

                    .token-number {
                        font-size: 48px;
                        font-weight: bold;
                        padding: 15px 0;
                        font-family: monospace;
                    }
                }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    <td class="bold large">${t('printTicket.title')}</td>
                </tr>
                <tr><td class="divider"></td></tr>
                <tr>
                    <td>${t('printTicket.tokenNo')}</td>
                </tr>
                <tr>
                    <td class="token-number">${token.displayNumber}</td>
                </tr>
                <tr>
                    <td class="small">
                        ${new Date().toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </td>
                </tr>
                <tr><td class="divider"></td></tr>
                <tr>
                    <td>${t('printTicket.details.service')} <span class="bold">${token.service.name}</span></td>
                </tr>
                <tr>
                    <td>${t('printTicket.details.type')} <span class="bold">${token.subService.name}</span></td>
                </tr>
                <tr>
                    <td>${t('printTicket.details.counter')} <span class="bold">${token.desk.displayName || token.desk.name}</span></td>
                </tr>
                <tr>
                    <td>${t('printTicket.details.staff')} <span class="bold">${token.assignedTo.fullName}</span></td>
                </tr>
                <tr><td class="divider"></td></tr>
                <tr>
                    <td class="small">${t('printTicket.footer')}</td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
};

export default function GenerateToken() {
    const { branchId } = useParams();
    const [services, setServices] = useState([]);
    const [allSubServices, setAllSubServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedSubService, setSelectedSubService] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [step, setStep] = useState('services');
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [generatedToken, setGeneratedToken] = useState(null);
    const t = useTranslations('tokenGeneration');

    // Load both services and their sub-services at once
    const loadInitialData = async () => {
        try {
            setInitialLoading(true);
            const servicesData = await tokenService.getBranchServices(branchId);
            
            if (!Array.isArray(servicesData)) {
                throw new Error(t('notifications.invalidData'));
            }

            // Load sub-services for all services in parallel
            const subServicesPromises = servicesData.map(service => 
                tokenService.getBranchSubServices(branchId, service.id)
                    .then(subServices => ({
                        serviceId: service.id,
                        subServices: Array.isArray(subServices) ? subServices : []
                    }))
                    .catch(error => ({
                        serviceId: service.id,
                        subServices: [],
                        error
                    }))
            );

            const subServicesResults = await Promise.all(subServicesPromises);

            // Create a map of service ID to sub-services
            const subServicesMap = subServicesResults.reduce((acc, result) => {
                acc[result.serviceId] = result.subServices;
                return acc;
            }, {});

            setServices(servicesData);
            setAllSubServices(subServicesMap);

        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        if (branchId) {
            loadInitialData();
        }
    }, [branchId]);

    // Memoize filtered sub-services based on selected service
    const filteredSubServices = useMemo(() => {
        if (!selectedService) return [];
        return allSubServices[selectedService.id] || [];
    }, [selectedService, allSubServices]);

    const handleServiceSelect = (service) => {
        setSelectedService(service);
        setSelectedSubService(null);
        setStep('subservices');
    };

    const handleSubServiceSelect = (subService) => {
        setSelectedSubService(subService);
    };

    const handleGenerateToken = async () => {
        if (!selectedService?.id || !selectedSubService?.id) {
            toast.error(t('notifications.selectBoth'));
            return;
        }

        try {
            setIsGeneratingToken(true);
            const response = await tokenService.generateToken(
                branchId,
                selectedService.id,
                selectedSubService.id
            );

            if (!response.success) {
                toast.error(response.error || t('notifications.generateError'));
                return;
            }

            setGeneratedToken(response.data);
            setShowTokenModal(true);
            printToken(response.data, t);

            // Reset selections
            setSelectedService(null);
            setSelectedSubService(null);
            setStep('services');

        } catch (error) {
            console.error('Token generation error:', error);
            toast.error(error?.message || t('notifications.generateError'));
        } finally {
            setIsGeneratingToken(false);
        }
    };

    return (
        <div className="min-h-screen bg-primaryGreen p-6">
            <div className="max-w-4xl mx-auto my-10">
            <div className="flex items-center justify-center overflow-hidden h-[100px] w-[500px] mx-auto">
                <Image src={logo} alt="Logo" height={100} width={500} className="object-contain"/>
            </div>
                <hr className="border-t-2 border-slate-300 mb-6" />
                
                {/* Show loader only during initial loading */}
                {initialLoading && <LoadingSpinner />}

                {/* Services Grid - Only show when not in initial loading */}
                {!initialLoading && step === 'services' && (
                    <div className="flex flex-col gap-4">
                        {services.length > 0 ? (
                            services.map(service => (
                                <div
                                    key={service.id}
                                    onClick={() => handleServiceSelect(service)}
                                    className="p-4 bg-white flex items-center rounded-xl shadow-md 
                                    transition-all duration-200 cursor-pointer
                                    hover:shadow-lg hover:scale-[1.02] hover:border-primaryOrange
                                    border-2 border-transparent
                                    active:scale-[0.98]"
                                >
                                    <ArrowRightIcon className="text-primaryOrange h-5 w-5 mr-1" />
                                    <h3 className="text-2xl ml-8 font-semibold mb-2 text-primaryGreen">
                                        {service.name}
                                    </h3>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-white p-8 bg-white/10 rounded-xl">
                                <p className="text-xl">{t('noServices')}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Sub-services Grid - Only show when not loading */}
                {!initialLoading && step === 'subservices' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-start text-white rounded-xl">
                            <button
                                onClick={() => setStep('services')}
                                className="text-gray-700 hover:text-gray-900 flex items-center
                                transition-all duration-200 hover:scale-105"
                            >
                                <span className="text-md text-black bg-gray-100 hover:bg-gray-200 
                                opacity-50 rounded-xl p-2 px-4">{t('backButton')}</span>
                            </button>
                        </div>

                        <h2 className="text-xl text-white font-semibold mb-4">
                            {t('subServiceTitle', { serviceName: selectedService?.name })}
                        </h2>

                        <div className="flex flex-col gap-4">
                            {filteredSubServices.map(subService => (
                                <div
                                    key={subService.id}
                                    onClick={() => handleSubServiceSelect(subService)}
                                    className={`p-4 bg-white flex items-center rounded-xl shadow-md 
                                    transition-all duration-200 cursor-pointer
                                    hover:shadow-lg hover:scale-[1.02]
                                    border-2 ${selectedSubService?.id === subService.id
                                            ? 'border-primaryOrange scale-[1.02] shadow-lg'
                                            : 'border-transparent'
                                        }
                                    active:scale-[0.98]`}
                                >
                                    <ArrowRightIcon className="text-primaryOrange h-5 w-5 mr-1" />
                                    <h3 className="text-2xl ml-8 font-semibold mb-2 text-primaryGreen">
                                        {subService.name}
                                    </h3>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center mt-6">
                            <Button
                                onClick={handleGenerateToken}
                                disabled={isGeneratingToken || !selectedSubService}
                                className={`bg-primaryOrange text-white rounded-xl px-8 py-3
                                transition-all duration-200
                                ${isGeneratingToken || !selectedSubService
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-primaryOrangeHover hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isGeneratingToken ? t('buttons.generate.generating') : t('buttons.generate.default')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Custom Token Generated Modal */}
                <Modal
                    isOpen={showTokenModal}
                    onClose={() => setShowTokenModal(false)}
                >
                    <div className="bg-gradient-to-b from-green-50 to-white rounded-lg p-6">
                        {/* Header */}
                        <div className="text-center mb-6">

                            <div className="w-16 h-1 bg-green-500 mx-auto rounded-full text-[#049898]"></div>
                        </div>

                        {generatedToken && (
                            <div className="space-y-6">
                                {/* Token Number Display */}
                                <div className="text-center bg-white p-6 rounded-xl shadow-inner border-2 border-green-100">
                                    <div className="text-7xl font-bold text-[#049898] mb-2 font-mono">
                                        {generatedToken.displayNumber}
                                    </div>
                                    <div className="text-gray-500 text-sm uppercase tracking-wide">
                                        {t('modal.tokenNumber')}
                                    </div>
                                </div>

                                {/* Service Details */}
                                <div className="space-y-3 bg-white p-4 rounded-xl shadow-sm">
                                    {/* Service */}
                                    <div className="flex flex-col p-3 hover:bg-green-50 rounded-lg transition-colors">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            {t('modal.details.service')}
                                        </span>
                                        <span className="text-gray-800 font-medium">
                                            {generatedToken.service.name}
                                        </span>
                                    </div>

                                    {/* Sub-Service */}
                                    <div className="flex flex-col p-3 hover:bg-green-50 rounded-lg transition-colors">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            {t('modal.details.subService')}
                                        </span>
                                        <span className="text-gray-800 font-medium">
                                            {generatedToken.subService.name}
                                        </span>
                                    </div>

                                    {/* Desk Details */}
                                    <div className="flex flex-col p-3 hover:bg-green-50 rounded-lg transition-colors">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            {t('modal.details.counter')}
                                        </span>
                                        <span className="text-gray-800 font-medium">
                                            {generatedToken.desk.displayName || generatedToken.desk.name}
                                        </span>
                                    </div>

                                    {/* Assigned To */}
                                    <div className="flex flex-col p-3 hover:bg-green-50 rounded-lg transition-colors">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                            {t('modal.details.staff')}
                                        </span>
                                        <span className="text-gray-800 font-medium">
                                            {generatedToken.assignedTo.fullName}
                                        </span>
                                    </div>
                                </div>

                                {/* Time and Date */}
                                <div className="text-center text-sm text-gray-500">
                                    {new Date().toLocaleString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            printToken(generatedToken, t);
                                        }}
                                        className="flex-1 bg-white text-[#049898] border-2 border-[#049898] hover:bg-gray-50 rounded-xl py-3"
                                    >
                                        {t('buttons.print')}
                                    </Button>
                                    <Button
                                        onClick={() => setShowTokenModal(false)}
                                        className="flex-1 bg-[#049898] hover:bg-[#048585] text-white rounded-xl py-3"
                                    >
                                        {t('buttons.close')}
                                    </Button>
                                </div>

                                {/* Footer Note */}
                                <div className="text-center text-xs text-gray-400 mt-4">
                                    {t('modal.footer')}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    );
}