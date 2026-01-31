import { Shield, Globe, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ConnectionStatusCardProps {
  isActive: boolean;
  location?: string;
  timeRemaining?: string;
  dataUsed?: string;
  dataLimit?: string;
}

export const ConnectionStatusCard = ({
  isActive,
  location = 'Germany',
  timeRemaining,
  dataUsed,
  dataLimit
}: ConnectionStatusCardProps) => {
  const { language } = useLanguage();

  const stats = [
    {
      icon: <Globe className="w-4 h-4" />,
      label: language === 'fa' ? 'موقعیت' : 'Location',
      value: location
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: language === 'fa' ? 'زمان باقی‌مانده' : 'Time Left',
      value: timeRemaining || '--'
    }
  ];

  return (
    <Card className={cn(
      "overflow-hidden",
      isActive && "border-emerald-500/20 bg-emerald-500/5"
    )}>
      <CardContent className="p-4">
        {/* Connection status header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isActive ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
          )}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">
              {isActive 
                ? (language === 'fa' ? 'اتصال امن' : 'Secure Connection')
                : (language === 'fa' ? 'قطع اتصال' : 'Not Connected')
              }
            </h3>
            <p className="text-xs text-muted-foreground">
              {isActive 
                ? (language === 'fa' ? 'ترافیک شما رمزنگاری شده است' : 'Your traffic is encrypted')
                : (language === 'fa' ? 'اشتراک فعالی ندارید' : 'No active subscription')
              }
            </p>
          </div>
        </div>

        {/* Stats grid */}
        {isActive && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50"
              >
                <div className="text-muted-foreground">{stat.icon}</div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="font-medium text-sm truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data usage */}
        {isActive && dataUsed && dataLimit && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {language === 'fa' ? 'مصرف داده' : 'Data Usage'}
              </span>
              <span className="text-xs font-medium">{dataUsed} / {dataLimit}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
