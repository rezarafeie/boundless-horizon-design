
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
import FreeTrialButton from "@/components/FreeTrialButton";

const Index = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          
          {/* Free Trial Section - Prominently displayed at top */}
          <section className="pt-20 pb-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-green-800 dark:text-green-200">
                🎁 Try Boundless Network for Free!
              </h2>
              <p className="text-green-600 dark:text-green-400 mb-6 max-w-md mx-auto">
                Get instant access with 1 day free trial. Choose between Lite or Pro plans.
              </p>
              <FreeTrialButton />
            </div>
          </section>

          <HeroSection />
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
