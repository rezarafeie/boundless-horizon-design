
import Navigation from "@/components/Navigation";
import MultiStepSubscriptionForm from "@/components/MultiStepSubscriptionForm";
import FooterSection from "@/components/FooterSection";

const Subscription = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      <div className="pt-20">
        <MultiStepSubscriptionForm />
      </div>
      <FooterSection />
    </div>
  );
};

export default Subscription;
