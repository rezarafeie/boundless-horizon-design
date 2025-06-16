
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
import ModernSubscriptionForm from "@/components/ModernSubscriptionForm";
import ModernFreeTrialForm from "@/components/ModernFreeTrialForm";

const Index = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          
          <HeroSection />
          <FeaturesSection />
          <PricingSection />
          <WhyBoundlessSection />
          <TestimonialsSection />
          
          {/* Free Trial Section */}
          <section id="free-trial" className="py-20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
            <div className="container mx-auto px-4">
              <ModernFreeTrialForm />
            </div>
          </section>

          {/* Purchase Section */}
          <section id="purchase" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="container mx-auto px-4">
              <ModernSubscriptionForm />
            </div>
          </section>

          <FAQSection />
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Index;
