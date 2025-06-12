
import { useState } from "react";

const faqs = [
  {
    question: "چگونه می‌توانم سرویس را فعال کنم؟",
    answer: "کافی است از طریق ربات تلگرام ما اقدام کنید. فرآیند فعال‌سازی کمتر از ۲ دقیقه طول می‌کشد."
  },
  {
    question: "آیا لاگ فعالیت‌ها نگهداری می‌شود؟",
    answer: "خیر، ما هیچ لاگی از فعالیت کاربران نگهداری نمی‌کنیم. حریم خصوصی شما برای ما مقدس است."
  },
  {
    question: "تفاوت پلن‌ها در چیست؟",
    answer: "Lite برای استفاده عادی، Pro برای کسب‌وکار با IP های تمیز، و Pro Plus شامل تونل ایرانی اختصاصی است."
  },
  {
    question: "آیا امکان تست رایگان وجود دارد؟",
    answer: "بله، ۲۴ ساعت تست رایگان برای همه پلن‌ها در نظر گرفته شده است."
  },
  {
    question: "سرعت اتصال چگونه است؟",
    answer: "سرعت بر اساس پلن انتخابی متفاوت است. پلن Pro و Pro Plus سرعت فوق‌العاده ارائه می‌دهند."
  },
  {
    question: "پشتیبانی چگونه انجام می‌شود؟",
    answer: "تیم پشتیبانی ۲۴/۷ از طریق تلگرام در دسترس است. زمان پاسخ‌گویی کمتر از ۱۰ دقیقه."
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-white to-primary/5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            سوالات متداول
          </h2>
          <p className="text-xl text-gray-600">
            پاسخ سوالات رایج درباره سرویس‌های ما
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-lg border border-gray-100 animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <button
                className="w-full p-6 text-right flex justify-between items-center hover:bg-gray-50 rounded-2xl transition-colors duration-200"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-lg font-semibold text-gray-900 flex-1">
                  {faq.question}
                </span>
                <div className={`transform transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-6 text-gray-600 leading-relaxed animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
