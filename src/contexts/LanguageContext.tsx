import { createContext, useContext, useState, ReactNode } from 'react';

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
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    
    // Hero Section
    'hero.title': 'Boundless Network',
    'hero.subtitle': 'Secure, fast, and unlimited – for professional users',
    'hero.cta': 'Join Telegram Bot',
    
    // Features
    'features.title': 'Unique Features',
    'features.subtitle': 'Boundless Network with cutting-edge technology and advanced capabilities',
    'features.clean-ips': 'Clean IPs',
    'features.clean-ips-desc': 'Dedicated and clean IP addresses for better access',
    'features.speed': 'Ultra-Fast Speed',
    'features.speed-desc': 'High-speed connection with minimal latency',
    'features.tunnel': 'Iranian Tunnel',
    'features.tunnel-desc': 'Special connection for domestic users (Pro+)',
    'features.no-logs': 'No Logs',
    'features.no-logs-desc': 'No activity data is stored',
    'features.routing': 'Smart Routing',
    'features.routing-desc': 'Automatic selection of the best connection path',
    'features.support': '24/7 Support',
    'features.support-desc': 'Support team always available',
    
    // Pricing
    'pricing.title': 'Pricing Plans',
    'pricing.subtitle': 'Choose the best plan for your needs',
    'pricing.lite': 'Lite',
    'pricing.pro': 'Pro',
    'pricing.pro-plus': 'Pro Plus',
    'pricing.monthly': 'monthly',
    'pricing.most-popular': 'Most Popular',
    'pricing.choose-plan': 'Choose Plan',
    'pricing.professional-plan': 'Most Professional Plan',
    
    // Why Boundless
    'why.title': 'Why Boundless Network?',
    'why.subtitle': 'Reasons for choosing us by thousands of professional users',
    'why.uptime': '24/7 Uptime',
    'why.uptime-desc': 'Uninterrupted service with highest availability',
    'why.fast-support': 'Fast Support',
    'why.fast-support-desc': 'Response in less than 10 minutes',
    'why.trust': 'Professional Trust',
    'why.trust-desc': 'Over 10,000 active professional users',
    'why.security': 'High Security',
    'why.security-desc': 'Military encryption and no logs',
    'why.global': 'Global Coverage',
    'why.global-desc': 'Access to the best servers worldwide',
    'why.quality': 'Reliable Quality',
    'why.quality-desc': 'Tested by professional technical teams',
    
    // Footer
    'footer.description': 'Secure, fast and unlimited – for professional users who trust the best quality.',
    'footer.services': 'Services',
    'footer.support': 'Support',
    'footer.telegram-bot': 'Telegram Bot',
    'footer.setup-guide': 'Setup Guide',
    'footer.faq': 'FAQ',
    'footer.contact': 'Contact Us',
    'footer.rights': '© 2024 BNETS.CO - All rights reserved',
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy Policy'
  },
  fa: {
    // Navigation
    'nav.features': 'ویژگی‌ها',
    'nav.pricing': 'قیمت‌گذاری',
    'nav.about': 'درباره ما',
    'nav.contact': 'تماس',
    
    // Hero Section
    'hero.title': 'شبکه بدون مرز',
    'hero.subtitle': 'امن، سریع و بدون محدودیت – برای کاربران حرفه‌ای',
    'hero.cta': 'ورود به ربات تلگرام',
    
    // Features
    'features.title': 'ویژگی‌های منحصر به فرد',
    'features.subtitle': 'شبکه بدون مرز با بهترین تکنولوژی‌ها و امکانات پیشرفته',
    'features.clean-ips': 'IP های تمیز',
    'features.clean-ips-desc': 'آدرس‌های IP مخصوص و تمیز برای دسترسی بهتر',
    'features.speed': 'سرعت فوق‌العاده',
    'features.speed-desc': 'اتصال پرسرعت با کمترین تأخیر ممکن',
    'features.tunnel': 'تونل ایرانی',
    'features.tunnel-desc': 'اتصال ویژه برای کاربران داخل کشور (Pro+)',
    'features.no-logs': 'بدون لاگ',
    'features.no-logs-desc': 'هیچ اطلاعاتی از فعالیت شما ذخیره نمی‌شود',
    'features.routing': 'مسیریابی هوشمند',
    'features.routing-desc': 'انتخاب خودکار بهترین مسیر برای اتصال',
    'features.support': 'پشتیبانی ۲۴/۷',
    'features.support-desc': 'تیم پشتیبانی همیشه در دسترس شما',
    
    // Pricing
    'pricing.title': 'پلن‌های قیمت‌گذاری',
    'pricing.subtitle': 'بهترین پلن را برای نیازهای خود انتخاب کنید',
    'pricing.lite': 'Lite',
    'pricing.pro': 'Pro',
    'pricing.pro-plus': 'Pro Plus',
    'pricing.monthly': 'ماهانه',
    'pricing.most-popular': 'محبوب‌ترین',
    'pricing.choose-plan': 'انتخاب پلن',
    'pricing.professional-plan': 'حرفه‌ای‌ترین پلن',
    
    // Why Boundless
    'why.title': 'چرا شبکه بدون مرز؟',
    'why.subtitle': 'دلایل انتخاب ما توسط هزاران کاربر حرفه‌ای',
    'why.uptime': '۲۴/۷ آپتایم',
    'why.uptime-desc': 'سرویس بدون وقفه با بالاترین درصد دسترسی',
    'why.fast-support': 'پشتیبانی سریع',
    'why.fast-support-desc': 'پاسخ‌گویی در کمتر از ۱۰ دقیقه',
    'why.trust': 'اعتماد حرفه‌ای‌ها',
    'why.trust-desc': 'بیش از ۱۰,۰۰۰ کاربر حرفه‌ای فعال',
    'why.security': 'امنیت بالا',
    'why.security-desc': 'رمزنگاری نظامی و بدون لاگ',
    'why.global': 'کاوریج جهانی',
    'why.global-desc': 'دسترسی به بهترین سرورهای دنیا',
    'why.quality': 'کیفیت مطمئن',
    'why.quality-desc': 'تست شده توسط تیم‌های فنی حرفه‌ای'
    
    // Footer and other translations remain the same
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('fa');
  
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
