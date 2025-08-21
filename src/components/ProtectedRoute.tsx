import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');

    useEffect(() => {
        if (!username) {
            navigate('/');
        }
    }, [username, navigate]);

    if (!username) return null;

    return <>{children}</>;
}

export default ProtectedRoute;