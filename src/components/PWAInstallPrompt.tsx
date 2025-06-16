
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

const PWAInstallPrompt = () => {
  const { language, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/28e6b45e-0a57-479d-8274-b76cf45c566a.png" 
              alt="BNETS.CO" 
              className="w-8 h-8"
            />
            <div>
              <h3 className="font-semibold text-sm">
                {language === 'fa' ? 'نصب اپلیکیشن' : 'Install App'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {language === 'fa' 
                  ? 'BNETS.CO را در دستگاه خود نصب کنید' 
                  : 'Install BNETS.CO on your device'
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={handleInstallClick} className="w-full" size="sm">
          <Download className={`w-4 h-4 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
          {language === 'fa' ? 'نصب' : 'Install'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PWAInstallPrompt;
