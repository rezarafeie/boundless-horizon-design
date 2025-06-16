
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyBoundlessSection from "@/components/WhyBoundlessSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import ModernPurchaseForm from "@/components/ModernPurchaseForm";
import ModernFreeTrialForm from "@/components/ModernFreeTrialForm";

const Index = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <HeroSection />
          <FeaturesSection />
          
          {/* Purchase Form Section */}
          <section id="purchase" className="py-24 px-4 bg-background">
            <ModernPurchaseForm />
          </section>
          
          {/* Free Trial Form Section */}
          <section id="free-trial" className="py-24 px-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
            <ModernFreeTrialForm />
          </section>
          
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
