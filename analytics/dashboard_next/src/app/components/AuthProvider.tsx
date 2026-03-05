'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Role = 'admin' | 'user';

interface AuthState {
    authenticated: boolean;
    role: Role | null;
    username: string | null;
}

interface AuthContextValue extends AuthState {
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const USERS: Record<string, { password: string; role: Role }> = {
    admin: { password: 'adminpassword', role: 'admin' },
    user: { password: 'userpassword', role: 'user' },
};

const AuthContext = createContext<AuthContextValue>({
    authenticated: false, role: null, username: null,
    login: () => false, logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ authenticated: false, role: null, username: null });
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from localStorage
    useEffect(() => {
        const savedAuth = localStorage.getItem('auth_state');
        if (savedAuth) {
            try {
                const parsed = JSON.parse(savedAuth);
                if (parsed.authenticated && parsed.role && parsed.username) {
                    setState(parsed);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        setIsLoaded(true);
    }, []);

    const login = useCallback((username: string, password: string): boolean => {
        const entry = USERS[username];
        if (entry && entry.password === password) {
            const newState = { authenticated: true, role: entry.role, username };
            setState(newState);
            localStorage.setItem('auth_state', JSON.stringify(newState));
            return true;
        }
        return false;
    }, []);

    const logout = useCallback(() => {
        setState({ authenticated: false, role: null, username: null });
        localStorage.removeItem('auth_state');
    }, []);

    // Prevent rendering children until we've checked localStorage
    // to avoid a flash of the login screen if they're already authenticated
    if (!isLoaded) {
        return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}></div>;
    }

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
