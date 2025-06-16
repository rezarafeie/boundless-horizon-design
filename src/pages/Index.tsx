
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyBoundlessSection from "@/components/WhyBoundlessSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import SubscriptionForm from "@/components/SubscriptionForm";

const Index = () => {
  const showSubscriptionForm = window.location.pathname === '/subscription';

  if (showSubscriptionForm) {
    return (
      <ThemeProvider>
        <LanguageProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <div className="pt-20">
              <SubscriptionForm />
            </div>
            <FooterSection />
          </div>
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <HeroSection />
          <FeaturesSection />
          <WhyBoundlessSection />
          <FAQSection />
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Index;
