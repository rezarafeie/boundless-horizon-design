
import { Card } from "@/components/ui/card";
import { useLanguage } from '@/contexts/LanguageContext';

const WhyBoundlessSection = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: "⚡",
      title: t('why.uptime'),
      description: t('why.uptime-desc')
    },
    {
      icon: "🚀",
      title: t('why.fast-support'),
      description: t('why.fast-support-desc')
    },
    {
      icon: "👥",
      title: t('why.trust'),
      description: t('why.trust-desc')
    },
    {
      icon: "🔒",
      title: t('why.security'),
      description: t('why.security-desc')
    },
    {
      icon: "🌍",
      title: t('why.global'),
      description: t('why.global-desc')
    },
    {
      icon: "💎",
      title: t('why.quality'),
      description: t('why.quality-desc')
    }
  ];

  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('why.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('why.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 bg-background/80 backdrop-blur-sm border border-border shadow-lg animate-slide-up group"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyBoundlessSection;
