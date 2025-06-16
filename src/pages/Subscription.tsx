
import Navigation from "@/components/Navigation";
import MarzbanSubscriptionForm from "@/components/MarzbanSubscriptionForm";
import FooterSection from "@/components/FooterSection";

const Subscription = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <MarzbanSubscriptionForm />
      </div>
      <FooterSection />
    </div>
  );
};

export default Subscription;
