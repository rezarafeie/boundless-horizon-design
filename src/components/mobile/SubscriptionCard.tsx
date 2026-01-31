import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, QrCode, Clock, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SubscriptionCardProps {
  id: string;
  username: string;
  subscriptionUrl?: string;
  expireAt?: string;
  dataLimitGb: number;
  status: string;
  onRemove?: (id: string) => void;
}

export const SubscriptionCard = ({
  id,
  username,
  subscriptionUrl,
  expireAt,
  dataLimitGb,
  status,
  onRemove
}: SubscriptionCardProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (subscriptionUrl && showQR) {
      QRCode.toDataURL(subscriptionUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(setQrDataUrl);
    }
  }, [subscriptionUrl, showQR]);

  useEffect(() => {
    if (!expireAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expire = new Date(expireAt);
      const diff = expire.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(language === 'fa' ? 'منقضی شده' : 'Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeRemaining(language === 'fa' 
          ? `${days} روز و ${hours} ساعت`
          : `${days}d ${hours}h`
        );
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(language === 'fa'
          ? `${hours} ساعت و ${minutes} دقیقه`
          : `${hours}h ${minutes}m`
        );
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [expireAt, language]);

  const handleCopy = async () => {
    if (!subscriptionUrl) return;
    
    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setCopied(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
      toast({
        title: language === 'fa' ? 'کپی شد!' : 'Copied!',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = () => {
    const isExpired = expireAt && new Date(expireAt) < new Date();
    
    if (isExpired || status === 'expired') {
      return <Badge variant="destructive">{language === 'fa' ? 'منقضی' : 'Expired'}</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{language === 'fa' ? 'فعال' : 'Active'}</Badge>;
    }
    if (status === 'pending' || status === 'awaiting_payment') {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{language === 'fa' ? 'در انتظار' : 'Pending'}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getTimeProgress = () => {
    if (!expireAt) return 0;
    const now = new Date();
    const expire = new Date(expireAt);
    const diff = expire.getTime() - now.getTime();
    if (diff <= 0) return 0;
    // Assuming 30-day subscription for progress calculation
    const totalDays = 30 * 24 * 60 * 60 * 1000;
    return Math.min(100, Math.max(0, (diff / totalDays) * 100));
  };

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all duration-200",
        "active:scale-[0.99] touch-manipulation",
        status === 'active' && "border-emerald-500/20"
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-mono font-semibold text-sm truncate">{username}</h3>
                {getStatusBadge()}
              </div>
              {timeRemaining && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{timeRemaining}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Progress bar */}
          {status === 'active' && expireAt && (
            <div className="mb-3">
              <Progress value={getTimeProgress()} className="h-1.5" />
            </div>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {subscriptionUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1 gap-2 h-9"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {language === 'fa' ? 'کپی' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQR(true)}
                  className="h-9"
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                </span>
                <span className="font-medium">{dataLimitGb} GB</span>
              </div>
              
              {expireAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {language === 'fa' ? 'تاریخ انقضا' : 'Expires'}
                  </span>
                  <span className="font-medium">
                    {new Date(expireAt).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US')}
                  </span>
                </div>
              )}

              {onRemove && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive mt-2">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === 'fa' ? 'حذف از لیست' : 'Remove from list'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {language === 'fa' ? 'آیا مطمئن هستید؟' : 'Are you sure?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {language === 'fa' 
                          ? 'این اشتراک از لیست ذخیره شده حذف خواهد شد. اشتراک شما همچنان فعال خواهد بود.'
                          : 'This subscription will be removed from your saved list. Your subscription will remain active.'
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{language === 'fa' ? 'انصراف' : 'Cancel'}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemove(id)}>
                        {language === 'fa' ? 'حذف' : 'Remove'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'fa' ? 'اسکن کنید' : 'Scan QR Code'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDataUrl && (
              <img 
                src={qrDataUrl} 
                alt="Subscription QR Code" 
                className="w-56 h-56 rounded-lg"
              />
            )}
            <p className="text-xs text-muted-foreground text-center">
              {language === 'fa' 
                ? 'این QR کد را با اپلیکیشن VPN خود اسکن کنید'
                : 'Scan this QR code with your VPN app'
              }
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
