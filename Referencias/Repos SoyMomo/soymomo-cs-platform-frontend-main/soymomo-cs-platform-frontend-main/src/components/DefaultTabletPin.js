import React, { useEffect, useState } from 'react';

const DefaultTabletPin = () => {
    const [pin, setPin] = useState('');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Function to get the default PIN
        const getDefaultTabletPin = async () => {
            const currentDate = new Date().toISOString().split('T')[0];
            const hashBuffer = new TextEncoder().encode(currentDate);
            const hash = await crypto.subtle.digest('SHA-256', hashBuffer);
            const hashArray = Array.from(new Uint8Array(hash));
            const hashString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
            const pin = hashString.replace(/\D/g, '').substring(0, 4).padEnd(4, '0');
            setPin(pin);
        };

        getDefaultTabletPin();
    }, []);

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                        <svg className="w-6 h-6 text-[#603BB0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-[#603BB0]">PIN por defecto</h2>
                </div>
                <button 
                    onClick={toggleVisibility}
                    className="p-2 text-[#603BB0] hover:bg-purple-50 rounded-lg transition-colors duration-200"
                >
                    {isVisible ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
            <div className="text-center">
                <p className="text-3xl font-mono tracking-wider text-gray-700 bg-gray-50 py-3 rounded-lg">
                    {isVisible ? pin.split('').join(' ') : '• • • •'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Este PIN cambia diariamente a medianoche</p>
            </div>
        </div>
    );
};

export default DefaultTabletPin;