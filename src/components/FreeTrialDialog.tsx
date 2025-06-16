
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Send } from 'lucide-react';

interface FreeTrialDialogProps {
  children: React.ReactNode;
}

const FreeTrialDialog = ({ children }: FreeTrialDialogProps) => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleTelegramContact = () => {
    window.open('https://t.me/bnets_support', '_blank');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-center">
            {t('free-trial.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('free-trial.subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('free-trial.telegram-note')}
            </p>
          </div>
          
          <Button 
            onClick={handleTelegramContact}
            className="w-full"
            size="lg"
          >
            <Send className={`w-5 h-5 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
            {t('free-trial.get-trial')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialDialog;
