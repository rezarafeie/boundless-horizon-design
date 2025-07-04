import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Gift, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import FreeTrialDialog from './FreeTrialDialog';
import FreeTrialResult from './FreeTrialResult';

interface FreeTrialWrapperProps {
  className?: string;
  size?: 'sm' | 'lg' | 'xl' | 'default' | 'icon';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

const FreeTrialWrapper: React.FC<FreeTrialWrapperProps> = ({ 
  className = "", 
  size = "xl",
  variant = "default"
}) => {
  const { language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [trialResult, setTrialResult] = useState<any>(null);

  const handleSuccess = (result: any) => {
    console.log('FREE_TRIAL_WRAPPER: Trial created successfully:', result);
    setTrialResult(result);
    setIsDialogOpen(false);
    setIsResultModalOpen(true);
  };

  const handleCloseResult = () => {
    setIsResultModalOpen(false);
    setTrialResult(null);
  };


  return (
    <>
      <Button 
        size={size}
        variant={variant}
        className={`w-full group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 font-semibold ${className}`}
        onClick={() => setIsDialogOpen(true)}
      >
        <Gift className={`w-4 h-4 group-hover:rotate-12 transition-transform duration-200 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
        {language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'}
      </Button>

      <FreeTrialDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Success Result Modal */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden">
          <div className="relative h-full overflow-y-auto">
            <button
              onClick={handleCloseResult}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {trialResult && (
              <FreeTrialResult result={{
                username: trialResult.username,
                subscription_url: trialResult.subscription_url,
                planName: trialResult.panel_name || 'Free Trial',
                apiType: trialResult.panel_type || 'marzban',
                dataLimit: 1, // 1GB for free trial
                duration: 7 // 7 days for free trial
              }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FreeTrialWrapper;