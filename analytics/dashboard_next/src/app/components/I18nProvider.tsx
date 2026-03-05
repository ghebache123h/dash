'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Lang = 'en' | 'ar';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
    en: {
        page_title: 'Dashboard Overview',
        page_subtitle: 'Codex-accurate analytics with real-time monitoring.',
        login_title: 'Sign in to Dashboard',
        username: 'Username',
        password: 'Password',
        login_btn: 'Sign In',
        invalid_creds: 'Invalid credentials',
        logout: 'Sign Out',
        role_admin: 'Admin',
        role_user: 'User',
        language: 'Language',
        total_messages: 'Total Messages',
        new_conversations: 'New Conversations',
        disney_customers: 'Disney Customers',
        disney_code_req: 'Disney Code Requests',
        otp_success: 'OTP Success',
        otp_failed: 'OTP Failed',
        otp_unconfirmed: 'OTP Unconfirmed',
        otp_not_sent: 'OTP Not Sent',
        escalations: 'Escalations',
        avg_msg_conv: 'Avg Msg / Conversation',
        token_totals: 'Token Totals',
        cost_token_summary: 'Cost & Token Summary',
        apply: 'Apply Filters',
        reset: 'Reset',
        from: 'From',
        to: 'To',
        channels: 'Channels',
        categories: 'Categories',
        presets: 'Quick Presets',
        today: 'Today',
        last_7: 'Last 7 Days',
        last_30: 'Last 30 Days',
        this_month: 'This Month',
        yesterday: 'Yesterday',
        date_range: 'Date Range',
        advanced_filters: 'Filters',
        auto_refresh: 'Auto-Refresh',
        refresh_off: 'Off',
        refresh_30s: '30s',
        refresh_60s: '60s',
        recent_events: 'Recent Events',
        overview: 'Overview',
        settings: 'Settings',
        menu: 'Menu',
        system_online: 'System Online',
        tt_total_messages: 'Total count of inbound + outbound messages in the selected period.',
        tt_otp_failed: 'OTP verification failed — usually due to max retries without a correct code.',
        tt_otp_unconfirmed: 'OTP was sent but the customer never confirmed or responded.',
        tt_otp_not_sent: 'OTP fetch failed silently from email — was blocked before sending to the user.',
        tt_escalations: 'Conversations transferred to a human support agent.',
        tt_disney_customers: 'Unique customers who sent inbound disney-related messages.',
        tt_disney_code_req: 'Total OTP request events in the period.',
        tt_otp_success: 'OTP verified successfully by the customer.',
        configure_pricing: 'Configure Pricing',
        vs: 'vs',
        performance_gauges: 'Performance Metrics',
        otp_success_rate: 'OTP Success Rate',
        otp_delivery_rate: 'OTP Delivery Rate',
        automation_rate: 'AI Automation Rate',
        self_service_rate: 'Self-Service Rate',
    },
    ar: {
        page_title: 'لوحة القيادة',
        page_subtitle: 'تحليلات دقيقة مع المراقبة المباشرة.',
        login_title: 'تسجيل الدخول إلى لوحة القيادة',
        username: 'اسم المستخدم',
        password: 'كلمة المرور',
        login_btn: 'دخول',
        invalid_creds: 'بيانات الاعتماد غير صالحة',
        logout: 'تسجيل خروج',
        role_admin: 'مسؤول',
        role_user: 'مستخدم',
        language: 'اللغة',
        total_messages: 'إجمالي الرسائل',
        new_conversations: 'محادثات جديدة',
        disney_customers: 'عملاء ديزني',
        disney_code_req: 'طلبات كود ديزني',
        otp_success: 'نجاح مع التأكيد',
        otp_failed: 'فشل الرمز',
        otp_unconfirmed: 'رمز غير مؤكد',
        otp_not_sent: 'رمز لم يُرسل',
        escalations: 'تصعيد الدعم',
        avg_msg_conv: 'متوسط الرسائل/محادثة',
        token_totals: 'مجموع الرموز',
        cost_token_summary: 'ملخص التكلفة والرموز',
        apply: 'تطبيق',
        reset: 'إعادة ضبط',
        from: 'من',
        to: 'إلى',
        channels: 'القنوات',
        categories: 'الفئات',
        presets: 'إعدادات سريعة',
        today: 'اليوم',
        last_7: 'آخر 7 أيام',
        last_30: 'آخر 30 يوم',
        this_month: 'هذا الشهر',
        yesterday: 'أمس',
        date_range: 'الفترة الزمنية',
        advanced_filters: 'الفلاتر',
        auto_refresh: 'تحديث تلقائي',
        refresh_off: 'إيقاف',
        refresh_30s: '30 ثانية',
        refresh_60s: '60 ثانية',
        recent_events: 'الأحداث الأخيرة',
        overview: 'نظرة عامة',
        settings: 'الإعدادات',
        menu: 'القائمة',
        system_online: 'النظام يعمل',
        tt_total_messages: 'إجمالي الرسائل الواردة والصادرة.',
        tt_otp_failed: 'فشل رمز التحقق. عادة بسبب تجاوز الحد الأقصى للمحاولات بدون رمز صحيح.',
        tt_otp_unconfirmed: 'تم إرسال الرمز ولكن لم يقم المستخدم بالرد أو التأكيد أبداً.',
        tt_otp_not_sent: 'تعذر جلب الرمز بصمت من البريد، تم إيقافه قبل الإرسال.',
        tt_escalations: 'الجلسات التي تم تحويلها للموظف البشري.',
        tt_disney_customers: 'عملاء فريدون (ديزني) أرسلوا رسائل واردة.',
        tt_disney_code_req: 'إجمالي طلبات رمز التحقق OTP.',
        tt_otp_success: 'تم التحقق من رمز OTP بنجاح.',
        configure_pricing: 'إعدادات التسعير',
        vs: 'مقارنة بـ',
        performance_gauges: 'مقاييس الأداء',
        otp_success_rate: 'معدل نجاح الرمز',
        otp_delivery_rate: 'معدل التوصيل',
        automation_rate: 'معدل الأتمتة',
        self_service_rate: 'معدل الخدمة الذاتية',
    },
};

interface I18nContextValue {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: string) => string;
    isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue>({
    lang: 'en', setLang: () => { }, t: (k) => k, isRtl: false,
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>('en');
    const isRtl = lang === 'ar';

    const t = useCallback((key: string): string => {
        return TRANSLATIONS[lang][key] || key;
    }, [lang]);

    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang, isRtl]);

    return (
        <I18nContext.Provider value={{ lang, setLang, t, isRtl }}>
            {children}
        </I18nContext.Provider>
    );
}
