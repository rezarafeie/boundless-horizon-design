
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa';

  const scrollToSubscription = () => {
    window.open('/subscription', '_blank');
  };

  const startFreeTrial = () => {
    window.open('https://t.me/getbnbot', '_blank');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-background"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float opacity-60"></div>
      <div className="absolute bottom-32 left-16 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl animate-float opacity-60" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-float opacity-60" style={{animationDelay: '2s'}}></div>
      
      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        <div className="animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full px-4 py-2 bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8">
            <span className="text-sm font-medium text-primary">
              {language === 'fa' ? '🚀 سرویس پیشرفته شبکه بدون مرز' : '🚀 Advanced Boundless Network Service'}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-tight">
            {t('hero.title')}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
              onClick={scrollToSubscription}
            >
              {t('hero.purchase')}
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 mr-2' : 'ml-2'}`} />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 rounded-2xl hover:bg-accent transition-all duration-300 group"
              onClick={startFreeTrial}
            >
              {t('hero.free-trial')}
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 mr-2' : 'ml-2'}`} />
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-border">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">10K+</div>
            <div className="text-sm text-muted-foreground">
              {language === 'fa' ? 'کاربر فعال' : 'Active Users'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">
              {language === 'fa' ? 'آپتایم' : 'Uptime'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">
              {language === 'fa' ? 'پشتیبانی' : 'Support'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
