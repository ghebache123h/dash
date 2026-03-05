'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

    const login = useCallback((username: string, password: string): boolean => {
        const entry = USERS[username];
        if (entry && entry.password === password) {
            setState({ authenticated: true, role: entry.role, username });
            return true;
        }
        return false;
    }, []);

    const logout = useCallback(() => {
        setState({ authenticated: false, role: null, username: null });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
