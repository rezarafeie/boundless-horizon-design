
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "IP های تمیز",
    description: "آدرس‌های IP مخصوص و تمیز برای دسترسی بهتر",
    icon: "🛡️"
  },
  {
    title: "سرعت فوق‌العاده",
    description: "اتصال پرسرعت با کمترین تأخیر ممکن",
    icon: "⚡"
  },
  {
    title: "تونل ایرانی",
    description: "اتصال ویژه برای کاربران داخل کشور (Pro+)",
    icon: "🚇"
  },
  {
    title: "بدون لاگ",
    description: "هیچ اطلاعاتی از فعالیت شما ذخیره نمی‌شود",
    icon: "🔒"
  },
  {
    title: "مسیریابی هوشمند",
    description: "انتخاب خودکار بهترین مسیر برای اتصال",
    icon: "🧠"
  },
  {
    title: "پشتیبانی ۲۴/۷",
    description: "تیم پشتیبانی همیشه در دسترس شما",
    icon: "💬"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            ویژگی‌های منحصر به فرد
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            شبکه بدون مرز با بهترین تکنولوژی‌ها و امکانات پیشرفته
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
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
