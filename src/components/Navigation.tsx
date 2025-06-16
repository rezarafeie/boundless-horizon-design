
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Menu, X, Globe, ChevronDown, Send, ShoppingCart, Gift, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import FreeTrialButton from './FreeTrialButton';
import SubscriptionRenewalDialog from './SubscriptionRenewalDialog';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRTL = language === 'fa';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {language === 'fa' ? 'شبکه بدون مرز' : 'BNETS.CO'}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center gap-8 ${isRTL ? 'space-x-reverse' : ''}`}>
            <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.features')}
            </a>
            <Link to="/subscription" className="text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.subscription')}
            </Link>
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

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="hidden sm:inline-flex">
                  {t('nav.get-network')}
                  <ChevronDown className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg">
                <DropdownMenuItem onClick={() => window.open('https://t.me/getbnbot', '_blank')} className="cursor-pointer">
                  <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('nav.telegram')}
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/subscription" className="flex items-center w-full">
                    <ShoppingCart className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('nav.purchase')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <div className="w-full">
                    <FreeTrialButton />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/renewal" className="flex items-center w-full">
                    <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('nav.renew')}
                  </Link>
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
            <Link to="/subscription" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.subscription')}
            </Link>
            <a href="#about" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.about')}
            </a>
            <a href="#contact" className="block text-foreground/70 hover:text-foreground transition-colors">
              {t('nav.contact')}
            </a>
            <div className="space-y-2 pt-4 border-t border-border">
              <Button 
                onClick={() => window.open('https://t.me/getbnbot', '_blank')}
                variant="outline"
                className="w-full justify-start"
              >
                <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('nav.telegram')}
              </Button>
              <Link to="/subscription">
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                >
                  <ShoppingCart className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('nav.purchase')}
                </Button>
              </Link>
              <FreeTrialButton />
              <Link to="/renewal">
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('nav.renew')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
