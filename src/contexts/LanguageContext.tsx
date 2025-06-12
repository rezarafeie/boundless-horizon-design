
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
    
    // Testimonials
    'testimonials.title': 'Customer Reviews',
    'testimonials.subtitle': 'Professional user experiences with Boundless Network',
    'testimonials.customer1.name': 'Alex Johnson',
    'testimonials.customer1.role': 'Freelance Developer',
    'testimonials.customer1.content': 'After testing several services, Boundless Network was the best choice. Outstanding speed and excellent stability.',
    'testimonials.customer2.name': 'Sarah Thompson',
    'testimonials.customer2.role': 'IT Company Manager',
    'testimonials.customer2.content': 'We use the Pro plan for our 20-person team. The quality and support are unparalleled.',
    'testimonials.customer3.name': 'Michael Chen',
    'testimonials.customer3.role': 'Graphic Designer',
    'testimonials.customer3.content': 'The Iranian Tunnel Pro Plus is ideal for my sensitive work. Speed and security in one package.',
    'testimonials.customer4.name': 'Emma Davis',
    'testimonials.customer4.role': 'Digital Marketer',
    'testimonials.customer4.content': 'Clean IPs and smart routing, exactly what I needed for my campaigns.',
    
    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Answers to common questions about our services',
    'faq.question1': 'How can I activate the service?',
    'faq.answer1': 'Simply use our Telegram bot. The activation process takes less than 2 minutes.',
    'faq.question2': 'Are activity logs stored?',
    'faq.answer2': 'No, we do not store any logs of user activities. Your privacy is sacred to us.',
    'faq.question3': 'What is the difference between plans?',
    'faq.answer3': 'Lite for regular use, Pro for business with clean IPs, and Pro Plus includes dedicated Iranian tunnel.',
    'faq.question4': 'Is there a free trial available?',
    'faq.answer4': 'Yes, 24-hour free trial is available for all plans.',
    'faq.question5': 'How is the connection speed?',
    'faq.answer5': 'Speed varies based on the selected plan. Pro and Pro Plus plans offer outstanding speed.',
    'faq.question6': 'How is support provided?',
    'faq.answer6': '24/7 support team available via Telegram. Response time is less than 10 minutes.',
    
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
    'why.quality-desc': 'تست شده توسط تیم‌های فنی حرفه‌ای',
    
    // Testimonials
    'testimonials.title': 'نظرات کاربران',
    'testimonials.subtitle': 'تجربه کاربران حرفه‌ای از شبکه بدون مرز',
    'testimonials.customer1.name': 'علی رضایی',
    'testimonials.customer1.role': 'توسعه‌دهنده فریلنسر',
    'testimonials.customer1.content': 'بعد از امتحان چندین سرویس، شبکه بدون مرز بهترین انتخاب بود. سرعت فوق‌العاده و پایداری عالی.',
    'testimonials.customer2.name': 'فاطمه احمدی',
    'testimonials.customer2.role': 'مدیر شرکت IT',
    'testimonials.customer2.content': 'برای تیم ۲۰ نفره‌مان از پلن Pro استفاده می‌کنیم. کیفیت و پشتیبانی بی‌نظیر.',
    'testimonials.customer3.name': 'محمد کریمی',
    'testimonials.customer3.role': 'طراح گرافیک',
    'testimonials.customer3.content': 'تونل ایرانی Pro Plus برای کارهای حساس من ایده‌آل است. سرعت و امنیت در یک بسته.',
    'testimonials.customer4.name': 'سارا موسوی',
    'testimonials.customer4.role': 'دیجیتال مارکتر',
    'testimonials.customer4.content': 'IP های تمیز و مسیریابی هوشمند، دقیقاً همان چیزی که برای کمپین‌هایم نیاز داشتم.',
    
    // FAQ
    'faq.title': 'سوالات متداول',
    'faq.subtitle': 'پاسخ سوالات رایج درباره سرویس‌های ما',
    'faq.question1': 'چگونه می‌توانم سرویس را فعال کنم؟',
    'faq.answer1': 'کافی است از طریق ربات تلگرام ما اقدام کنید. فرآیند فعال‌سازی کمتر از ۲ دقیقه طول می‌کشد.',
    'faq.question2': 'آیا لاگ فعالیت‌ها نگهداری می‌شود؟',
    'faq.answer2': 'خیر، ما هیچ لاگی از فعالیت کاربران نگهداری نمی‌کنیم. حریم خصوصی شما برای ما مقدس است.',
    'faq.question3': 'تفاوت پلن‌ها در چیست؟',
    'faq.answer3': 'Lite برای استفاده عادی، Pro برای کسب‌وکار با IP های تمیز، و Pro Plus شامل تونل ایرانی اختصاصی است.',
    'faq.question4': 'آیا امکان تست رایگان وجود دارد؟',
    'faq.answer4': 'بله، ۲۴ ساعت تست رایگان برای همه پلن‌ها در نظر گرفته شده است.',
    'faq.question5': 'سرعت اتصال چگونه است؟',
    'faq.answer5': 'سرعت بر اساس پلن انتخابی متفاوت است. پلن Pro و Pro Plus سرعت فوق‌العاده ارائه می‌دهند.',
    'faq.question6': 'پشتیبانی چگونه انجام می‌شود؟',
    'faq.answer6': 'تیم پشتیبانی ۲۴/۷ از طریق تلگرام در دسترس است. زمان پاسخ‌گویی کمتر از ۱۰ دقیقه.',
    
    // Footer
    'footer.description': 'امن، سریع و بدون محدودیت – برای کاربران حرفه‌ای که به بهترین کیفیت اعتماد دارند.',
    'footer.services': 'سرویس‌ها',
    'footer.support': 'پشتیبانی',
    'footer.telegram-bot': 'ربات تلگرام',
    'footer.setup-guide': 'راهنمای نصب',
    'footer.faq': 'سوالات متداول',
    'footer.contact': 'تماس با ما',
    'footer.rights': '© ۲۰۲۴ BNETS.CO - تمامی حقوق محفوظ است',
    'footer.terms': 'قوانین و مقررات',
    'footer.privacy': 'حریم خصوصی'
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
      <div className={language === 'fa' ? 'rtl' : 'ltr'} dir={language === 'fa' ? 'rtl' : 'ltr'}>
        {children}
      </div>
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
