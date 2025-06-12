
import { Card } from "@/components/ui/card";
import { useLanguage } from '@/contexts/LanguageContext';

const TestimonialsSection = () => {
  const { t } = useLanguage();

  const testimonials = [
    {
      name: t('testimonials.customer1.name'),
      role: t('testimonials.customer1.role'),
      content: t('testimonials.customer1.content'),
      rating: 5
    },
    {
      name: t('testimonials.customer2.name'),
      role: t('testimonials.customer2.role'),
      content: t('testimonials.customer2.content'),
      rating: 5
    },
    {
      name: t('testimonials.customer3.name'),
      role: t('testimonials.customer3.role'),
      content: t('testimonials.customer3.content'),
      rating: 5
    },
    {
      name: t('testimonials.customer4.name'),
      role: t('testimonials.customer4.role'),
      content: t('testimonials.customer4.content'),
      rating: 5
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('testimonials.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 bg-background border border-border shadow-lg animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg italic">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-primary-foreground font-bold mr-4">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-foreground">{testimonial.name}</div>
                  <div className="text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
