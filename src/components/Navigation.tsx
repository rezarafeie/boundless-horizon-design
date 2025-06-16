
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Menu, X, Globe, Gift, CreditCard } from 'lucide-react';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRTL = language === 'fa';

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {language === 'fa' ? 'شبکه بدون مرز' : 'BNETS.CO'}
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center gap-8 ${isRTL ? 'space-x-reverse' : ''}`}>
            <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.features')}
            </a>
            <button 
              onClick={() => scrollToSection('subscription')}
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {language === 'fa' ? 'اشتراک' : 'Subscription'}
            </button>
            <a href="#about" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.about')}
            </a>
            <a href="#contact" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.contact')}
            </a>
          </div>

          {/* Controls */}
          <div className={`flex items-center gap-4 ${isRTL ? 'space-x-reverse' : ''}`}>
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
              className="w-9 h-9"
            >
              <Globe className="w-4 h-4" />
            </Button>

            {/* CTA Buttons */}
            <div className="hidden lg:flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('free-trial')}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Gift className="w-4 h-4 mr-1" />
                {language === 'fa' ? 'آزمایش رایگان' : 'Free Trial'}
              </Button>
              
              <Button 
                size="sm"
                onClick={() => scrollToSection('subscription')}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-9 h-9"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <a href="#features" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.features')}
            </a>
            <button 
              onClick={() => scrollToSection('subscription')}
              className="block text-foreground/70 hover:text-foreground transition-colors"
            >
              {language === 'fa' ? 'اشتراک' : 'Subscription'}
            </button>
            <a href="#about" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.about')}
            </a>
            <a href="#contact" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.contact')}
            </a>
            
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                variant="outline"
                onClick={() => scrollToSection('free-trial')}
                className="w-full text-green-600 border-green-600 hover:bg-green-50"
              >
                <Gift className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'آزمایش رایگان' : 'Free Trial'}
              </Button>
              
              <Button 
                onClick={() => scrollToSection('subscription')}
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
