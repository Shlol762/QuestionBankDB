import React from 'react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface StepWizardProps {
  steps: WizardStep[];
  currentStep: number; // 0-indexed
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  isSubmitting = false
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Step Progress Header */}
      <div className="relative flex items-center justify-between px-4">
        {/* Connection line background */}
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-white/10 z-0" />
        
        {/* Connection line active progress */}
        <div 
          className="absolute top-5 left-10 h-0.5 bg-neon-blue-500 transition-all duration-300 z-0"
          style={{ width: `${(currentStep / (steps.length - 1)) * 80}%` }}
        />

        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              <button
                onClick={() => isCompleted && onStepChange(index)}
                disabled={!isCompleted}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  isActive
                    ? 'bg-neon-blue-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)] scale-110'
                    : isCompleted
                    ? 'bg-neon-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-surface-700 text-gray-400 border border-white/5'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </button>
              <span 
                className={`mt-2 text-xs font-medium text-center whitespace-nowrap transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Description */}
      {steps[currentStep].description && (
        <p className="text-sm text-gray-400 px-2 text-center">
          {steps[currentStep].description}
        </p>
      )}

      {/* Active Step Content */}
      <div className="flex-1 min-h-[300px] p-2 pb-48">
        {steps[currentStep].content}
      </div>

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-blue-500/50"
            >
              Back
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`next-step-btn px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 flex items-center gap-2 ${
              isLastStep
                ? 'bg-neon-emerald-600 hover:bg-neon-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-neon-blue-600 hover:bg-neon-blue-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 focus:ring-neon-blue-500`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : isLastStep ? (
              'Complete'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepWizard;
