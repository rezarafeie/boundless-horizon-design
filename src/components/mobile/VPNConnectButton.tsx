import { useState } from 'react';
import { Copy, QrCode, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { useEffect } from 'react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'active' | 'expired' | 'pending';

interface VPNConnectButtonProps {
  status: ConnectionStatus;
  subscriptionUrl?: string;
  username?: string;
  expireAt?: string;
  onConnect?: () => void;
}

export const VPNConnectButton = ({
  status,
  subscriptionUrl,
  username,
  expireAt,
  onConnect
}: VPNConnectButtonProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

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
        description: language === 'fa' ? 'لینک اشتراک کپی شد' : 'Subscription link copied'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'کپی نشد' : 'Failed to copy',
        variant: 'destructive'
      });
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          glow: 'shadow-emerald-500/50',
          pulse: 'animate-pulse',
          label: language === 'fa' ? 'فعال' : 'Active',
          sublabel: language === 'fa' ? 'آماده اتصال' : 'Ready to connect'
        };
      case 'pending':
        return {
          color: 'bg-amber-500',
          glow: 'shadow-amber-500/50',
          pulse: 'animate-pulse',
          label: language === 'fa' ? 'در انتظار' : 'Pending',
          sublabel: language === 'fa' ? 'در حال پردازش' : 'Processing'
        };
      case 'expired':
        return {
          color: 'bg-red-500',
          glow: 'shadow-red-500/50',
          pulse: '',
          label: language === 'fa' ? 'منقضی' : 'Expired',
          sublabel: language === 'fa' ? 'تمدید کنید' : 'Please renew'
        };
      case 'connecting':
        return {
          color: 'bg-blue-500',
          glow: 'shadow-blue-500/50',
          pulse: 'animate-spin',
          label: language === 'fa' ? 'در حال اتصال' : 'Connecting',
          sublabel: language === 'fa' ? 'لطفا صبر کنید' : 'Please wait'
        };
      default:
        return {
          color: 'bg-muted',
          glow: '',
          pulse: '',
          label: language === 'fa' ? 'قطع' : 'Disconnected',
          sublabel: language === 'fa' ? 'اشتراکی ندارید' : 'No subscription'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <>
      <div className="flex flex-col items-center gap-6 py-8">
        {/* Main connection button */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-30",
            config.color
          )} />
          
          {/* Main button */}
          <button
            onClick={subscriptionUrl ? handleCopy : onConnect}
            disabled={status === 'disconnected' && !onConnect}
            className={cn(
              "relative w-44 h-44 rounded-full flex flex-col items-center justify-center",
              "bg-gradient-to-br from-card to-card/80",
              "border-4 transition-all duration-300",
              "active:scale-95 touch-manipulation",
              status !== 'disconnected' && `border-current ${config.glow} shadow-2xl`
            )}
            style={{ 
              borderColor: status !== 'disconnected' ? 'currentColor' : 'hsl(var(--border))',
              color: config.color.replace('bg-', '').includes('emerald') ? 'rgb(16 185 129)' :
                     config.color.replace('bg-', '').includes('amber') ? 'rgb(245 158 11)' :
                     config.color.replace('bg-', '').includes('red') ? 'rgb(239 68 68)' :
                     config.color.replace('bg-', '').includes('blue') ? 'rgb(59 130 246)' :
                     'hsl(var(--muted-foreground))'
            }}
          >
            {/* Status indicator dot */}
            <div className={cn(
              "w-4 h-4 rounded-full mb-3",
              config.color,
              config.pulse
            )} />
            
            {/* Status text */}
            <span className="text-lg font-bold text-foreground">{config.label}</span>
            <span className="text-xs text-muted-foreground mt-1">{config.sublabel}</span>
            
            {/* Copy icon if has subscription */}
            {subscriptionUrl && status !== 'disconnected' && (
              <div className="mt-3 text-muted-foreground">
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </div>
            )}
          </button>
        </div>

        {/* Username display */}
        {username && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'fa' ? 'نام کاربری' : 'Username'}
            </p>
            <p className="font-mono font-semibold">{username}</p>
          </div>
        )}

        {/* Action buttons */}
        {subscriptionUrl && status !== 'disconnected' && (
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(true)}
              className="gap-2"
            >
              <QrCode className="w-4 h-4" />
              {language === 'fa' ? 'QR کد' : 'QR Code'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {language === 'fa' ? 'کپی لینک' : 'Copy Link'}
            </Button>
          </div>
        )}
      </div>

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
