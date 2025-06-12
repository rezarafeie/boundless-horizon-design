
import { Card } from "@/components/ui/card";

const testimonials = [
  {
    name: "علی رضایی",
    role: "توسعه‌دهنده فریلنسر",
    content: "بعد از امتحان چندین سرویس، شبکه بدون مرز بهترین انتخاب بود. سرعت فوق‌العاده و پایداری عالی.",
    rating: 5
  },
  {
    name: "فاطمه احمدی",
    role: "مدیر شرکت IT",
    content: "برای تیم ۲۰ نفره‌مان از پلن Pro استفاده می‌کنیم. کیفیت و پشتیبانی بی‌نظیر.",
    rating: 5
  },
  {
    name: "محمد کریمی",
    role: "طراح گرافیک",
    content: "تونل ایرانی Pro Plus برای کارهای حساس من ایده‌آل است. سرعت و امنیت در یک بسته.",
    rating: 5
  },
  {
    name: "سارا موسوی",
    role: "دیجیتال مارکتر",
    content: "IP های تمیز و مسیریابی هوشمند، دقیقاً همان چیزی که برای کمپین‌هایم نیاز داشتم.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            نظرات کاربران
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            تجربه کاربران حرفه‌ای از شبکه بدون مرز
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 bg-white border-0 shadow-lg animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed text-lg italic">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-600">{testimonial.role}</div>
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
