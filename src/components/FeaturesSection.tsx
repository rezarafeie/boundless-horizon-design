
import { Card } from "@/components/ui/card";
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Zap, Network, Lock, Brain, MessageSquare } from 'lucide-react';

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      title: t('features.clean-ips'),
      description: t('features.clean-ips-desc'),
      icon: Shield
    },
    {
      title: t('features.speed'),
      description: t('features.speed-desc'),
      icon: Zap
    },
    {
      title: t('features.tunnel'),
      description: t('features.tunnel-desc'),
      icon: Network
    },
    {
      title: t('features.no-logs'),
      description: t('features.no-logs-desc'),
      icon: Lock
    },
    {
      title: t('features.routing'),
      description: t('features.routing-desc'),
      icon: Brain
    },
    {
      title: t('features.support'),
      description: t('features.support-desc'),
      icon: MessageSquare
    }
  ];

  return (
    <section id="features" className="py-24 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('features.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 bg-background border border-border animate-slide-up group"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
