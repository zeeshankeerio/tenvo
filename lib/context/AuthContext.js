'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../auth-client';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
    updateProfile: async () => { },
});

/**
 * Auth Context Provider
 * Manages Better Auth authentication state
 */
export function AuthProvider({ children }) {
    const { data, isPending, error } = authClient.useSession();

    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('AuthContext - isPending:', isPending, 'session:', !!data?.session, 'error:', error);
        }
        if (error) {
            console.error('AuthContext - Session error:', error);
        }
        if (!isPending) {
            setSession(data?.session ?? null);
            setUser(data?.user ?? null);
            setLoading(false);
        }
    }, [data, isPending, error]);

    const signOut = async () => {
        try {
            await authClient.signOut();

            // Clear local states
            setSession(null);
            setUser(null);

            // Redirect to login
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const updateProfile = async (updates) => {
        try {
            // Better Auth update user logic
            const { data: updatedUser, error } = await authClient.updateUser(updates);
            if (error) throw error;
            setUser(updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    const value = {
        user,
        session,
        loading,
        signOut,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context
 */
export const useAuth = () => useContext(AuthContext);
