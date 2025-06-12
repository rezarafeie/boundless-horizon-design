
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const plans = [
  {
    name: "Lite",
    price: "پایه",
    description: "برای کاربران عادی",
    features: [
      "آلمان، فنلاند، آمریکا",
      "پهنای باند استاندارد",
      "پشتیبانی عادی",
      "۱ دستگاه همزمان"
    ],
    locations: ["🇩🇪", "🇫🇮", "🇺🇸"],
    popular: false
  },
  {
    name: "Pro",
    price: "حرفه‌ای",
    description: "برای کسب‌وکارها",
    features: [
      "۶ کشور مختلف",
      "سرعت فوق‌العاده",
      "پشتیبانی اولویت‌دار",
      "۵ دستگاه همزمان",
      "IP مخصوص"
    ],
    locations: ["🇫🇮", "🇩🇪", "🇳🇱", "🇹🇷", "🇬🇧", "🇺🇸"],
    popular: true
  },
  {
    name: "Pro Plus",
    price: "پیشرفته",
    description: "Pro + تونل ایرانی",
    features: [
      "همه‌ی ویژگی‌های Pro",
      "تونل ایرانی",
      "پشتیبانی نیم‌بها",
      "۱۰ دستگاه همزمان",
      "اولویت اتصال"
    ],
    locations: ["🇮🇷", "🇫🇮", "🇩🇪", "🇳🇱", "🇹🇷", "🇬🇧", "🇺🇸"],
    popular: false
  }
];

const PricingSection = () => {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            پلن‌های قیمتی
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            پلن مناسب خود را انتخاب کنید
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-slide-up ${
                plan.popular 
                  ? 'gradient-primary text-white shadow-2xl scale-105' 
                  : 'bg-white shadow-lg'
              }`}
              style={{animationDelay: `${index * 0.2}s`}}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                  محبوب‌ترین
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className={`text-3xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-primary'}`}>
                  {plan.price}
                </div>
                <p className={`${plan.popular ? 'text-white/90' : 'text-gray-600'}`}>
                  {plan.description}
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-wrap gap-1 justify-center mb-4">
                  {plan.locations.map((flag, i) => (
                    <span key={i} className="text-2xl">{flag}</span>
                  ))}
                </div>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={`flex items-center ${plan.popular ? 'text-white' : 'text-gray-700'}`}>
                      <span className="ml-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                className={`w-full py-3 rounded-xl transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-white text-primary hover:bg-gray-100' 
                    : 'gradient-primary text-white hover:shadow-lg'
                }`}
                onClick={() => window.open('https://t.me/getbnbot', '_blank')}
              >
                انتخاب پلن
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
