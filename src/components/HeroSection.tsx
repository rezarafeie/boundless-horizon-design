
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Zap, Globe, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import FreeTrialDialog from './FreeTrialDialog';

const HeroSection = () => {
  const { language } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/20 overflow-hidden">
      {/* Minimal Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]"></div>
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="space-y-12 animate-fade-in">
          {/* Trust Badge */}
          <div className="inline-flex items-center space-x-2 space-x-reverse bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-5 py-2.5">
            <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {language === 'fa' ? '۱۰,۰۰۰+ کاربر فعال' : 'Trusted by 10,000+ users'}
            </span>
          </div>
          
          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
              {language === 'fa' ? (
                <>
                  اینترنت بدون
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent">
                    محدودیت
                  </span>
                </>
              ) : (
                <>
                  Internet without
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent">
                    limits
                  </span>
                </>
              )}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
              {language === 'fa'
                ? 'با BNETS.CO به سرعت نور به تمام محتوای جهانی دسترسی پیدا کنید. امن، سریع و قابل اعتماد.'
                : 'Access global content at light speed with BNETS.CO. Secure, fast, and reliable VPN service.'
              }
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Shield className="w-4 h-4 text-green-600" />
              <span>{language === 'fa' ? 'رمزگذاری نظامی' : 'Military-grade encryption'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span>{language === 'fa' ? 'سرعت بالا' : 'High-speed servers'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{language === 'fa' ? '۵۰+ کشور' : '50+ countries'}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto pt-8">
            <Button asChild variant="hero-primary" size="xl" className="w-full sm:flex-1 h-16 text-lg font-semibold">
              <Link to="/subscription" className="group">
                {language === 'fa' ? 'شروع کن' : 'Get Started'}
                <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>

            <FreeTrialDialog>
              <Button 
                variant="hero-secondary" 
                size="xl" 
                className="w-full sm:flex-1 h-16 text-lg font-semibold"
              >
                {language === 'fa' ? 'تست رایگان' : 'Try Free'}
              </Button>
            </FreeTrialDialog>
          </div>

          {/* Secondary CTA */}
          <div className="pt-4">
            <Button asChild variant="ghost" size="lg" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <Link to="/renewal" className="group">
                {language === 'fa' ? 'تمدید اشتراک موجود' : 'Renew existing subscription'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">99.9%</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                {language === 'fa' ? 'آپتایم سرور' : 'Server Uptime'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                {language === 'fa' ? 'کاربر راضی' : 'Happy Users'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">
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
