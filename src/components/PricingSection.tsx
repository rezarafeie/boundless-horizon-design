
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Lite",
    price: "۹۹,۰۰۰",
    period: "ماهانه",
    description: "برای کاربران عادی",
    features: [
      "آلمان، فنلاند، آمریکا",
      "سرعت استاندارد",
      "بدون لاگ",
      "پشتیبانی ۲۴/۷"
    ],
    popular: false,
    buttonText: "انتخاب پلن"
  },
  {
    name: "Pro",
    price: "۱۹۹,۰۰۰",
    period: "ماهانه",
    description: "برای کسب و کار",
    features: [
      "فنلاند، آلمان، هلند، ترکیه، انگلیس، آمریکا",
      "سرعت فوق‌العاده",
      "IP های تمیز اختصاصی",
      "مسیریابی هوشمند",
      "پشتیبانی اولویت‌دار"
    ],
    popular: true,
    buttonText: "محبوب‌ترین پلن"
  },
  {
    name: "Pro Plus",
    price: "۳۹۹,۰۰۰",
    period: "ماهانه",
    description: "Pro + تونل ایرانی",
    features: [
      "همه امکانات Pro",
      "تونل ایرانی اختصاصی",
      "پشتیبانی نیم‌بها",
      "سرعت بی‌نظیر",
      "اولویت کامل"
    ],
    popular: false,
    buttonText: "حرفه‌ای‌ترین پلن"
  }
];

const PricingSection = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-white to-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            پلن‌های قیمت‌گذاری
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            بهترین پلن را برای نیازهای خود انتخاب کنید
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative p-8 ${
                plan.popular 
                  ? 'border-2 border-primary shadow-2xl scale-105 bg-gradient-to-br from-primary/5 to-purple-50' 
                  : 'shadow-lg hover:shadow-xl bg-white'
              } transition-all duration-300 animate-slide-up`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">
                    محبوب‌ترین
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 mr-2">تومان</span>
                  <div className="text-sm text-gray-500">{plan.period}</div>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="text-green-500 ml-3">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full py-3 ${
                  plan.popular 
                    ? 'bg-primary hover:bg-primary/90' 
                    : 'bg-gray-900 hover:bg-gray-800'
                } text-white rounded-xl transition-all duration-300`}
                onClick={() => window.open('https://t.me/getbnbot', '_blank')}
              >
                {plan.buttonText}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
