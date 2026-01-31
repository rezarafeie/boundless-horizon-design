import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Share2, 
  MoreVertical, 
  Plus, 
  ChevronRight,
  Smartphone,
  Apple,
  Globe,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const iosSteps = [
    {
      icon: <Share2 className="w-5 h-5" />,
      title: language === 'fa' ? 'روی دکمه Share بزنید' : 'Tap the Share button',
      desc: language === 'fa' ? 'در نوار پایین Safari' : 'At the bottom of Safari'
    },
    {
      icon: <Plus className="w-5 h-5" />,
      title: language === 'fa' ? '"Add to Home Screen" را انتخاب کنید' : 'Select "Add to Home Screen"',
      desc: language === 'fa' ? 'در منوی باز شده' : 'In the opened menu'
    },
    {
      icon: <Check className="w-5 h-5" />,
      title: language === 'fa' ? 'روی "Add" بزنید' : 'Tap "Add"',
      desc: language === 'fa' ? 'اپ به صفحه اصلی اضافه می‌شود' : 'App will be added to home screen'
    }
  ];

  const androidSteps = [
    {
      icon: <MoreVertical className="w-5 h-5" />,
      title: language === 'fa' ? 'روی منو (⋮) بزنید' : 'Tap the menu (⋮)',
      desc: language === 'fa' ? 'در گوشه بالا سمت راست' : 'In the top right corner'
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: language === 'fa' ? '"Install app" را انتخاب کنید' : 'Select "Install app"',
      desc: language === 'fa' ? 'یا "Add to Home screen"' : 'Or "Add to Home screen"'
    },
    {
      icon: <Check className="w-5 h-5" />,
      title: language === 'fa' ? 'نصب را تایید کنید' : 'Confirm installation',
      desc: language === 'fa' ? 'اپ نصب می‌شود' : 'App will be installed'
    }
  ];

  const steps = platform === 'ios' ? iosSteps : androidSteps;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Header */}
      <header 
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50"
        style={{ paddingTop: 'var(--sat, 0px)' }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground">
            {language === 'fa' ? 'بازگشت' : 'Back'}
          </button>
          <h1 className="font-bold">
            {language === 'fa' ? 'نصب اپلیکیشن' : 'Install App'}
          </h1>
          <button
            onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 text-xs font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'fa' ? 'EN' : 'فا'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* App icon and info */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-lg">
            <img 
              src="/lovable-uploads/28e6b45e-0a57-479d-8274-b76cf45c566a.png" 
              alt="BNETS.CO"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold">BNETS.CO</h2>
            <p className="text-sm text-muted-foreground">
              {language === 'fa' ? 'شبکه بدون مرز' : 'Boundless Network'}
            </p>
          </div>
        </div>

        {/* Already installed */}
        {isInstalled ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {language === 'fa' ? 'اپ نصب شده است!' : 'App is installed!'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fa' 
                    ? 'می‌توانید اپ را از صفحه اصلی دستگاه خود باز کنید'
                    : 'You can open the app from your home screen'
                  }
                </p>
              </div>
              <Button onClick={() => navigate('/app')} className="w-full">
                {language === 'fa' ? 'ورود به اپ' : 'Open App'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Platform tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setPlatform('android')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  platform === 'android' ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                <Smartphone className="w-4 h-4" />
                Android
              </button>
              <button
                onClick={() => setPlatform('ios')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  platform === 'ios' ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                <Apple className="w-4 h-4" />
                iOS
              </button>
            </div>

            {/* Install button (Android with prompt) */}
            {platform === 'android' && deferredPrompt && (
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="w-5 h-5" />
                {language === 'fa' ? 'نصب اپلیکیشن' : 'Install App'}
              </Button>
            )}

            {/* Installation steps */}
            <Card>
              <CardContent className="p-4 space-y-1">
                <h3 className="font-semibold mb-4">
                  {language === 'fa' ? 'مراحل نصب:' : 'Installation Steps:'}
                </h3>
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-4 py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                    <div className="text-muted-foreground">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="space-y-3">
              <h3 className="font-semibold">
                {language === 'fa' ? 'مزایای نصب اپ:' : 'Benefits:'}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {language === 'fa' ? 'دسترسی سریع از صفحه اصلی' : 'Quick access from home screen'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {language === 'fa' ? 'کار کردن در حالت آفلاین' : 'Works offline'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {language === 'fa' ? 'تجربه کاربری مثل اپ واقعی' : 'Native app experience'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {language === 'fa' ? 'بدون نیاز به اپ استور' : 'No app store needed'}
                </li>
              </ul>
            </div>
          </>
        )}

        {/* Skip to web version */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/app')}>
            {language === 'fa' ? 'ادامه در مرورگر' : 'Continue in browser'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InstallApp;
