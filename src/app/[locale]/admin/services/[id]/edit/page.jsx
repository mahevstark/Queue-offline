'use client';
import ServiceForm from '../../ServiceForm';
import { use } from 'react';

export default function EditServicePage({ params }) {
    const resolvedParams = use(params);
    
    return (
        <ServiceForm serviceId={resolvedParams.id} />
    );
}