
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import FreeTrialButton from './FreeTrialButton';

const HeroSection = () => {
  const { language, t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div className="space-y-8 animate-fade-in">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 space-x-reverse bg-white/10 dark:bg-gray-900/30 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'fa' ? 'شبکه بدون مرز' : 'Boundless Network'}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gradient mb-6">
              {language === 'fa' ? 'BNETS.CO' : 'BNETS.CO'}
            </h1>
            
            <h2 className="text-2xl md:text-4xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {language === 'fa' 
                ? 'دسترسی آزاد به اینترنت جهانی' 
                : 'Free Access to Global Internet'
              }
            </h2>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {language === 'fa'
                ? 'با پروتکل‌های پیشرفته VLESS و VMess، سرعت بالا و امنیت کامل را تجربه کنید. هیچ محدودیتی نمی‌تواند مانع دسترسی شما به جهان دیجیتال باشد.'
                : 'Experience high-speed and complete security with advanced VLESS and VMess protocols. No restrictions can prevent your access to the digital world.'
              }
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center space-x-2 space-x-reverse bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-full px-4 py-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'fa' ? 'امنیت بالا' : 'High Security'}
              </span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-full px-4 py-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'fa' ? 'سرعت فوق‌العاده' : 'Ultra Speed'}
              </span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-full px-4 py-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'fa' ? 'سرورهای جهانی' : 'Global Servers'}
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-4xl mx-auto">
            <Button asChild variant="hero-primary" size="xl" className="w-full sm:w-auto group">
              <Link to="/subscription">
                {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
                <ArrowLeft className={`w-5 h-5 group-hover:translate-x-1 transition-transform duration-200 ${language === 'fa' ? 'mr-2' : 'ml-2'}`} />
              </Link>
            </Button>

            <div className="w-full sm:w-auto">
              <FreeTrialButton />
            </div>

            <Button asChild variant="hero-accent" size="xl" className="w-full sm:w-auto group">
              <Link to="/renewal">
                {language === 'fa' ? 'تمدید اشتراک' : 'Renew Subscription'}
                <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform duration-200 ${language === 'fa' ? 'mr-2' : 'ml-2'}`} />
              </Link>
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-300">
                {language === 'fa' ? 'کاربر فعال' : 'Active Users'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">99.9%</div>
              <div className="text-gray-600 dark:text-gray-300">
                {language === 'fa' ? 'آپتایم سرور' : 'Server Uptime'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-300">
                {language === 'fa' ? 'پشتیبانی' : 'Support'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
