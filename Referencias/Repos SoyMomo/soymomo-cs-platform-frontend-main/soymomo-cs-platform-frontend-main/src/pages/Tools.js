import MainLayout from '../layouts/layout';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, checkAuth } from '../authContext';
import DefaultTabletPin from '../components/DefaultTabletPin';

export default function Tools() {
    const { tokens } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!tokens || !checkAuth(tokens)) {
            navigate('/login');
        }
    }, [tokens, navigate]);

    return (
        <MainLayout currentView="tools">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-[#603BB0] text-start mb-6">Herramientas</h1>
                <DefaultTabletPin />
            </div>
        </MainLayout>
    )
}
