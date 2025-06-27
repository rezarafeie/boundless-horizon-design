
import React from 'react';
import PlanSelector from '@/components/PlanSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlanWithPanels } from '@/services/planService';

interface PlanSelectionProps {
  selectedPlan: PlanWithPanels | null;
  onPlanSelect: (plan: PlanWithPanels) => void;
  dataLimit: number;
}

const PlanSelection = ({ selectedPlan, onPlanSelect, dataLimit }: PlanSelectionProps) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'لطفاً پلن مورد نظر خود را انتخاب کنید' : 'Please select your desired plan'}
        </p>
      </div>

      <PlanSelector
        selectedPlan={selectedPlan?.id || null}
        onPlanSelect={onPlanSelect}
        dataLimit={dataLimit}
      />
    </div>
  );
};

export default PlanSelection;
