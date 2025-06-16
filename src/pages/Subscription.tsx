
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import MultiStepSubscriptionForm from "@/components/MultiStepSubscriptionForm";
import FooterSection from "@/components/FooterSection";
import ZarinpalDebug from "@/components/ZarinpalDebug";

const Subscription = () => {
  const [searchParams] = useSearchParams();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (searchParams.get('debug') === 'true') {
      setShowDebug(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      <div className="pt-20">
        <MultiStepSubscriptionForm />
      </div>
      <FooterSection />
      
      {showDebug && (
        <ZarinpalDebug onClose={() => setShowDebug(false)} />
      )}
    </div>
  );
};

export default Subscription;
