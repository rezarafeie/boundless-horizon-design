
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import WhyBoundlessSection from "@/components/WhyBoundlessSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import SubscriptionSteps from "@/components/SubscriptionSteps";

const Index = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <HeroSection />
          
          {/* Free Trial Section */}
          <section id="free-trial" className="py-16 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4 text-green-800 dark:text-green-200">
                  🎁 آزمایش رایگان شبکه بدون مرز
                </h2>
                <p className="text-green-600 dark:text-green-400 max-w-md mx-auto">
                  یک روز دسترسی رایگان با ۱ گیگابایت حجم داده
                </p>
              </div>
              <SubscriptionSteps mode="trial" />
            </div>
          </section>

          {/* Subscription Section */}
          <section id="subscription" className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  خرید اشتراک شبکه بدون مرز
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  پلن مناسب خود را انتخاب کرده و اشتراک سفارشی ایجاد کنید
                </p>
              </div>
              <SubscriptionSteps mode="paid" />
            </div>
          </section>

          <FeaturesSection />
          <PricingSection />
          <WhyBoundlessSection />
          <TestimonialsSection />
          <FAQSection />
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Index;
