
import { Card } from "@/components/ui/card";

const benefits = [
  {
    icon: "⚡",
    title: "۲۴/۷ آپتایم",
    description: "سرویس بدون وقفه با بالاترین درصد دسترسی"
  },
  {
    icon: "🚀",
    title: "پشتیبانی سریع",
    description: "پاسخ‌گویی در کمتر از ۱۰ دقیقه"
  },
  {
    icon: "👥",
    title: "اعتماد حرفه‌ای‌ها",
    description: "بیش از ۱۰,۰۰۰ کاربر حرفه‌ای فعال"
  },
  {
    icon: "🔒",
    title: "امنیت بالا",
    description: "رمزنگاری نظامی و بدون لاگ"
  },
  {
    icon: "🌍",
    title: "کاوریج جهانی",
    description: "دسترسی به بهترین سرورهای دنیا"
  },
  {
    icon: "💎",
    title: "کیفیت مطمئن",
    description: "تست شده توسط تیم‌های فنی حرفه‌ای"
  }
];

const WhyBoundlessSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-primary/5 to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            چرا شبکه بدون مرز؟
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            دلایل انتخاب ما توسط هزاران کاربر حرفه‌ای
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {benefit.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
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
