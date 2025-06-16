
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fa';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.features': 'Features',
    'nav.subscription': 'Subscription',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.dropdown': 'Get Boundless Network',
    'nav.telegram': 'Telegram Bot',
    'nav.purchase': 'Purchase',
    'nav.free-trial': 'Free Trial',
    
    // Hero Section
    'hero.title': 'Boundless Network',
    'hero.subtitle': 'Secure, fast, and reliable network access with global server coverage',
    'hero.cta': 'Get Started',
    'hero.purchase': 'Purchase Plan',
    'hero.free-trial': 'Try Free',
    'hero.badge': '🚀 Advanced Network Service',
    
    // Features
    'features.title': 'Why Choose Boundless Network?',
    'features.subtitle': 'Experience premium network access with cutting-edge technology',
    
    // Pricing - Updated Plan Descriptions
    'pricing.title': 'Choose Your Plan',
    'pricing.subtitle': 'Select the perfect plan for your network access needs',
    'pricing.lite': 'Boundless Network Lite',
    'pricing.lite-desc': 'A lightweight access option for users who need basic connection with fewer locations and moderate speed',
    'pricing.pro': 'Boundless Network Pro', 
    'pricing.pro-desc': 'A premium connection plan with full global access, highest speed, and stable connections — especially optimized for streaming, remote work, and gaming',
    'pricing.pro-plus': 'Boundless Network Pro+',
    'pricing.monthly': 'Monthly',
    'pricing.choose-plan': 'Choose Plan',
    'pricing.most-popular': 'Most Popular',
    'pricing.professional-plan': 'Professional Plan',
    
    // Purchase Form
    'purchase.title': 'Purchase Boundless Network',
    'purchase.step1': 'Select Plan',
    'purchase.step2': 'Enter Details',
    'purchase.step3': 'Confirmation',
    'purchase.plan-selection': 'Choose Your Plan',
    'purchase.user-info': 'User Information',
    'purchase.final-step': 'Complete Purchase',
    
    // Free Trial
    'trial.title': 'Free Trial - Boundless Network',
    'trial.subtitle': '1 day free access with 1GB data',
    'trial.select-plan': 'Select Trial Plan',
    'trial.lite-name': 'Boundless Network Lite Trial',
    'trial.pro-name': 'Boundless Network Pro Trial',
    'trial.lite-desc': 'Moderate speed, limited servers',
    'trial.pro-desc': 'High performance, full server list',
    
    // Common
    'common.select': 'Select',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.submit': 'Submit',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error'
  },
  fa: {
    // Navigation
    'nav.features': 'ویژگی‌ها',
    'nav.subscription': 'اشتراک',
    'nav.about': 'درباره ما',
    'nav.contact': 'تماس',
    'nav.dropdown': 'دریافت شبکه بدون مرز',
    'nav.telegram': 'ربات تلگرام',
    'nav.purchase': 'خرید',
    'nav.free-trial': 'آزمایش رایگان',
    
    // Hero Section
    'hero.title': 'شبکه بدون مرز',
    'hero.subtitle': 'دسترسی امن، سریع و قابل اعتماد به شبکه با پوشش سرورهای جهانی',
    'hero.cta': 'شروع کنید',
    'hero.purchase': 'خرید پلن',
    'hero.free-trial': 'آزمایش رایگان',
    'hero.badge': '🚀 سرویس پیشرفته شبکه',
    
    // Features
    'features.title': 'چرا شبکه بدون مرز را انتخاب کنیم؟',
    'features.subtitle': 'دسترسی به شبکه درجه یک با تکنولوژی پیشرفته را تجربه کنید',
    
    // Pricing - Updated Plan Descriptions
    'pricing.title': 'پلن خود را انتخاب کنید',
    'pricing.subtitle': 'پلن مناسب برای نیازهای دسترسی شبکه خود را انتخاب کنید',
    'pricing.lite': 'شبکه بدون مرز لایت',
    'pricing.lite-desc': 'گزینه دسترسی سبک برای کاربرانی که به اتصال پایه با مکان‌های کمتر و سرعت متوسط نیاز دارند',
    'pricing.pro': 'شبکه بدون مرز پرو',
    'pricing.pro-desc': 'پلن اتصال پریمیوم با دسترسی کامل جهانی، بالاترین سرعت و اتصالات پایدار — به‌ویژه برای استریمینگ، کار از راه دور و بازی بهینه‌سازی شده',
    'pricing.pro-plus': 'شبکه بدون مرز پرو+',
    'pricing.monthly': 'ماهانه',
    'pricing.choose-plan': 'انتخاب پلن',
    'pricing.most-popular': 'محبوب‌ترین',
    'pricing.professional-plan': 'پلن حرفه‌ای',
    
    // Purchase Form
    'purchase.title': 'خرید شبکه بدون مرز',
    'purchase.step1': 'انتخاب پلن',
    'purchase.step2': 'وارد کردن جزئیات',
    'purchase.step3': 'تأیید',
    'purchase.plan-selection': 'پلن خود را انتخاب کنید',
    'purchase.user-info': 'اطلاعات کاربر',
    'purchase.final-step': 'تکمیل خرید',
    
    // Free Trial
    'trial.title': 'آزمایش رایگان - شبکه بدون مرز',
    'trial.subtitle': '۱ روز دسترسی رایگان با ۱ گیگابایت حجم',
    'trial.select-plan': 'پلن آزمایشی را انتخاب کنید',
    'trial.lite-name': 'آزمایش شبکه بدون مرز لایت',
    'trial.pro-name': 'آزمایش شبکه بدون مرز پرو',
    'trial.lite-desc': 'سرعت متوسط، سرورهای محدود',
    'trial.pro-desc': 'کارایی بالا، لیست کامل سرورها',
    
    // Common
    'common.select': 'انتخاب',
    'common.continue': 'ادامه',
    'common.back': 'بازگشت',
    'common.submit': 'ارسال',
    'common.loading': 'در حال بارگذاری...',
    'common.success': 'موفق',
    'common.error': 'خطا'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fa');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
