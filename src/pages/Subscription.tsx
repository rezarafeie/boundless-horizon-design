
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import MarzbanSubscriptionForm from "@/components/MarzbanSubscriptionForm";
import FooterSection from "@/components/FooterSection";

const Subscription = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="pt-20">
            <MarzbanSubscriptionForm />
          </div>
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Subscription;
