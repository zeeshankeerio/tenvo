'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authClient } from '../auth-client';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    /** True after hub layout hydrated a server-validated session (client may still revalidate). */
    serverHydrated: false,
    hydrateFromServer: (_payload) => {},
    signOut: async () => {},
    updateProfile: async () => {},
});

/**
 * Auth Context Provider
 * Manages Better Auth authentication state.
 *
 * Hub layouts may call hydrateFromServer() with a serializable session hint so
 * chrome/tenant sync do not wait on a second client round-trip after the
 * server layout already validated the session.
 */
export function AuthProvider({ children }) {
    const { data, isPending, error } = authClient.useSession();

    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [serverHydrated, setServerHydrated] = useState(false);

    const hydrateFromServer = useCallback((payload) => {
        if (!payload?.user?.id) return;
        setUser((prev) => prev ?? payload.user);
        setSession((prev) => prev ?? payload.session ?? { userId: payload.user.id });
        setLoading(false);
        setServerHydrated(true);
    }, []);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                'AuthContext - isPending:',
                isPending,
                'session:',
                !!data?.session,
                'serverHydrated:',
                serverHydrated,
                'error:',
                error
            );
        }
        if (error) {
            console.error('AuthContext - Session error:', error);
        }
        if (isPending) {
            // Keep progressive paint if the hub already hydrated a server session.
            return;
        }
        setSession(data?.session ?? null);
        setUser(data?.user ?? null);
        setLoading(false);
    }, [data, isPending, error, serverHydrated]);

    const signOut = async () => {
        try {
            await authClient.signOut();

            setSession(null);
            setUser(null);
            setServerHydrated(false);

            window.location.href = '/login';
        } catch (err) {
            console.error('Error signing out:', err);
        }
    };

    const updateProfile = async (updates) => {
        try {
            const { data: updatedUser, error: updateError } = await authClient.updateUser(updates);
            if (updateError) throw updateError;
            setUser(updatedUser);
            return updatedUser;
        } catch (err) {
            console.error('Error updating profile:', err);
            throw err;
        }
    };

    const value = {
        user,
        session,
        loading,
        serverHydrated,
        hydrateFromServer,
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
