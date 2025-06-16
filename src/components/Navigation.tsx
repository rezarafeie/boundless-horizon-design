
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Menu, X, Globe, ChevronDown, MessageCircle, CreditCard, Gift } from 'lucide-react';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRTL = language === 'fa';

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
            <a href="/subscription" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.subscription')}
            </a>
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

            {/* Action Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="hidden sm:inline-flex">
                  {language === 'fa' ? 'عملیات' : 'Actions'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => scrollToSection('free-trial')}>
                  <Gift className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'آزمایش رایگان' : 'Free Trial'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection('purchase')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open('https://t.me/getbnbot', '_blank')}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'تلگرام پشتیبانی' : 'Telegram Support'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            <a href="/subscription" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.subscription')}
            </a>
            <a href="#about" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.about')}
            </a>
            <a href="#contact" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.contact')}
            </a>
            
            <div className="pt-4 border-t border-border space-y-2">
              <Button 
                onClick={() => scrollToSection('free-trial')}
                className="w-full justify-start bg-green-600 hover:bg-green-700"
              >
                <Gift className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'آزمایش رایگان' : 'Free Trial'}
              </Button>
              <Button 
                onClick={() => scrollToSection('purchase')}
                className="w-full justify-start"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
              </Button>
              <Button 
                onClick={() => window.open('https://t.me/getbnbot', '_blank')}
                variant="outline"
                className="w-full justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'تلگرام پشتیبانی' : 'Telegram Support'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
