
import { Card } from "@/components/ui/card";

const testimonials = [
  {
    name: "احمد رضایی",
    role: "توسعه‌دهنده نرم‌افزار",
    content: "بهترین سرویس VPN که تا حالا استفاده کردم. سرعت فوق‌العاده و اتصال پایدار.",
    rating: 5
  },
  {
    name: "مریم احمدی",
    role: "طراح گرافیک",
    content: "برای کارهای فریلنسری عالیه. IP های تمیز و پشتیبانی فوری.",
    rating: 5
  },
  {
    name: "علی محمدی",
    role: "صاحب کسب‌وکار",
    content: "تیم ما از پلن Pro استفاده می‌کنه. کیفیت عالی و قیمت منصفانه.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            نظرات کاربران
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            تجربه‌ی کاربران از شبکه بدون مرز
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/90 backdrop-blur-sm border-0 shadow-lg animate-slide-up"
              style={{animationDelay: `${index * 0.2}s`}}
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                "{testimonial.content}"
              </p>
              
              <div>
                <h4 className="font-bold text-gray-900 text-lg">
                  {testimonial.name}
                </h4>
                <p className="text-gray-600">
                  {testimonial.role}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
