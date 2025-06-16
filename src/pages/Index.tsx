
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyBoundlessSection from "@/components/WhyBoundlessSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import ZarinpalDebug from "@/components/ZarinpalDebug";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (searchParams.get('debug') === 'true') {
      setShowDebug(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <WhyBoundlessSection />
      <FAQSection />
      <FooterSection />
      
      {showDebug && (
        <ZarinpalDebug onClose={() => setShowDebug(false)} />
      )}
    </div>
  );
};

export default Index;
