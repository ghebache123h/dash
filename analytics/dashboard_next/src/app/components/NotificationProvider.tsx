'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface NotificationContextProps {
    isMuted: boolean;
    toggleMute: () => void;
    notifyEscalation: (currentCount: number) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
    isMuted: false,
    toggleMute: () => { },
    notifyEscalation: () => { },
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [isMuted, setIsMuted] = useState(false);
    const lastEscalationCount = useRef<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('notification-muted');
        if (saved !== null) {
            setIsMuted(saved === 'true');
        }
    }, []);

    const toggleMute = () => {
        setIsMuted((prev) => {
            const next = !prev;
            localStorage.setItem('notification-muted', String(next));
            return next;
        });
    };

    const playSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Pitch up quick

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // Fade in
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6); // Fade out long

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    };

    const notifyEscalation = (currentCount: number) => {
        if (lastEscalationCount.current === null) {
            // First time tracking, don't ding
            lastEscalationCount.current = currentCount;
            return;
        }

        if (currentCount > lastEscalationCount.current) {
            if (!isMuted) {
                playSound();
            }
            lastEscalationCount.current = currentCount;
        } else if (currentCount < lastEscalationCount.current) {
            // If it resets or we filter differently, just update
            lastEscalationCount.current = currentCount;
        }
    };

    return (
        <NotificationContext.Provider value={{ isMuted, toggleMute, notifyEscalation }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}
