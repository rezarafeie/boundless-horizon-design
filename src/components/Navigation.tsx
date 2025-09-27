
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
import FreeTrialWrapper from './FreeTrialWrapper';
import { ConnectionIndicator } from './ConnectionIndicator';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRTL = language === 'fa';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with Connection Indicator */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {language === 'fa' ? 'شبکه بدون مرز' : 'BNETS.CO'}
            </Link>
            <ConnectionIndicator />
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
                <Button className="hidden sm:inline-flex bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  {t('nav.get-network')}
                  <ChevronDown className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align={isRTL ? "start" : "end"} 
                className="w-72 bg-gradient-to-br from-white/95 via-blue-50/95 to-purple-50/95 dark:from-gray-900/95 dark:via-blue-900/95 dark:to-purple-900/95 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-700/50 shadow-2xl p-4 rounded-2xl"
              >
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-0 mb-3 border-0">
                  <Button
                    onClick={() => window.open('https://t.me/bnets_support', '_blank')} 
                    className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} p-4 bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 h-auto rounded-xl`}
                    variant="ghost"
                  >
                    <Send className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'} text-blue-100`} />
                    <span className="font-semibold text-white">{t('nav.telegram')}</span>
                  </Button>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-0 mb-3 border-0">
                  <Link to="/subscription" className="w-full">
                    <Button className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} p-4 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 h-auto rounded-xl`} variant="ghost">
                      <ShoppingCart className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'} text-green-100`} />
                      <span className="font-semibold text-white">{t('nav.purchase')}</span>
                    </Button>
                  </Link>
                </DropdownMenuItem>
                
                
                <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-0 border-0">
                  <Link to="/renewal" className="w-full">
                    <Button className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} p-4 bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600 hover:from-orange-600 hover:via-amber-700 hover:to-yellow-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 h-auto rounded-xl`} variant="ghost">
                      <RefreshCw className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'} text-orange-100`} />
                      <span className="font-semibold text-white">{t('nav.renew')}</span>
                    </Button>
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

        {/* Mobile Menu - Simplified */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            <Button 
              onClick={() => window.open('https://t.me/bnets_support', '_blank')}
              variant="outline"
              className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 shadow-md hover:shadow-lg transition-all duration-200`}
            >
              <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-blue-600 dark:text-blue-400`} />
              <span className="text-blue-800 dark:text-blue-200 font-medium">{t('nav.telegram')}</span>
            </Button>
            
            <Link to="/subscription">
              <Button 
                variant="outline"
                className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/50 dark:hover:to-green-800/50 shadow-md hover:shadow-lg transition-all duration-200`}
              >
                <ShoppingCart className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-green-600 dark:text-green-400`} />
                <span className="text-green-800 dark:text-green-200 font-medium">{t('nav.purchase')}</span>
              </Button>
            </Link>
            
            
            <Link to="/renewal">
              <Button 
                variant="outline"
                className={`w-full ${isRTL ? 'justify-end' : 'justify-start'} bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/50 dark:hover:to-orange-800/50 shadow-md hover:shadow-lg transition-all duration-200`}
              >
                <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-orange-600 dark:text-orange-400`} />
                <span className="text-orange-800 dark:text-orange-200 font-medium">{t('nav.renew')}</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
