
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Globe } from 'lucide-react';

const FooterSection = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa';

  return (
    <footer className="bg-gray-900 text-white py-8 px-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        {/* Logo & Tagline */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gradient">
            {language === 'fa' ? 'شبکه بدون مرز' : 'BNETS.CO'}
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {language === 'fa'
              ? 'دسترسی آزاد به اینترنت جهانی'
              : 'Free Access to Global Internet'
            }
          </p>
        </div>

        {/* Single CTA Button */}
        <Button 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          onClick={() => window.open('https://t.me/bnets_support', '_blank')}
        >
          <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'fa' ? 'پشتیبانی تلگرام' : 'Telegram Support'}
        </Button>

        {/* Minimal Copyright */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-xs">
            © 2024 {language === 'fa' ? 'شبکه بدون مرز' : 'BNETS.CO'}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
