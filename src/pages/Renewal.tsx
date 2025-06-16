
import Navigation from "@/components/Navigation";
import StepByStepRenewalForm from "@/components/StepByStepRenewalForm";
import FooterSection from "@/components/FooterSection";

const Renewal = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <StepByStepRenewalForm />
      </div>
      <FooterSection />
    </div>
  );
};

export default Renewal;
