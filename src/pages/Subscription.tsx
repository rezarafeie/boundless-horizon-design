
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import SubscriptionForm from "@/components/SubscriptionForm";
import FooterSection from "@/components/FooterSection";

const Subscription = () => {
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
};

export default Subscription;
