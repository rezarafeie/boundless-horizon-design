
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import StepByStepRenewalForm from "@/components/StepByStepRenewalForm";
import FooterSection from "@/components/FooterSection";

const Renewal = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="pt-20">
            <StepByStepRenewalForm />
          </div>
          <FooterSection />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Renewal;
