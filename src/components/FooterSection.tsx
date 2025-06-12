
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';

const FooterSection = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa';

  return (
    <footer className="bg-gray-900 text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4 text-gradient">
              {language === 'fa' ? 'شبکه بدون مرز' : 'Boundless Network'}
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t('footer.description')}
            </p>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl"
              onClick={() => window.open('https://t.me/getbnbot', '_blank')}
            >
              {t('hero.cta')}
            </Button>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2 text-gray-300">
              <li>{language === 'fa' ? 'پلن Lite' : 'Lite Plan'}</li>
              <li>{language === 'fa' ? 'پلن Pro' : 'Pro Plan'}</li>
              <li>{language === 'fa' ? 'پلن Pro Plus' : 'Pro Plus Plan'}</li>
              <li>{language === 'fa' ? 'تونل ایرانی' : 'Iranian Tunnel'}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://t.me/getbnbot" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  {t('footer.telegram-bot')}
                </a>
              </li>
              <li>{t('footer.setup-guide')}</li>
              <li>{t('footer.faq')}</li>
              <li>{t('footer.contact')}</li>
            </ul>
          </div>
        </div>
        
        <div className={`border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          <div className="text-gray-400 mb-4 md:mb-0">
            {t('footer.rights')}
          </div>
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              {t('footer.privacy')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
