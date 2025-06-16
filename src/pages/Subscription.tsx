
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import ModernSubscriptionForm from "@/components/ModernSubscriptionForm";
import FooterSection from "@/components/FooterSection";

const Subscription = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="pt-20">
            <ModernSubscriptionForm />
          </div>
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Subscription;
