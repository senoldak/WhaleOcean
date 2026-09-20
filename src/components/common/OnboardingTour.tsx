'use client';

import React, { useState, useEffect } from 'react';
import { Waves, Compass, Terminal, CheckCircle2, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

const ONBOARDING_STORAGE_KEY = 'whale_ocean_onboarding_dismissed';

interface OnboardingTourProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingTour({ forceOpen = false, onClose }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }
    try {
      const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!dismissed) {
        // Automatically open for first-time visitors with a short gentle delay
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [forceOpen]);

  const handleDismiss = (dontShowAgain = false) => {
    setIsOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch {}
    }
    if (onClose) onClose();
  };

  const steps = [
    {
      title: t.onboarding.step1Title,
      desc: t.onboarding.step1Desc,
      icon: <Waves className="w-6 h-6 text-ocean-cyan" />,
    },
    {
      title: t.onboarding.step2Title,
      desc: t.onboarding.step2Desc,
      icon: <Compass className="w-6 h-6 text-emerald-400" />,
    },
    {
      title: t.onboarding.step3Title,
      desc: t.onboarding.step3Desc,
      icon: <Terminal className="w-6 h-6 text-purple-400" />,
    },
  ];

  if (!isOpen) return null;

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-abyss/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-ocean-surface border border-ocean-border rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Top bar with progress indicator */}
        <div className="p-4 border-b border-ocean-border bg-ocean-deep/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ocean-cyan" />
            <span className="text-xs font-bold font-mono tracking-wider text-ocean-text">
              WHALE OCEAN QUICKSTART
            </span>
          </div>
          <button
            onClick={() => handleDismiss(false)}
            className="p-1 rounded-lg text-ocean-muted hover:text-ocean-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-ocean-deep border border-ocean-border/80 flex items-center justify-center shadow-inner">
            {steps[currentStep].icon}
          </div>

          <div>
            <span className="text-[11px] font-mono text-ocean-cyan tracking-widest uppercase">
              Adım {currentStep + 1} / {steps.length}
            </span>
            <h3 className="text-base font-bold text-ocean-text mt-1">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs text-ocean-muted leading-relaxed mt-2 font-mono">
              {steps[currentStep].desc}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 pt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-ocean-cyan'
                    : 'w-1.5 bg-ocean-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-ocean-border bg-ocean-deep/50 flex items-center justify-between">
          <button
            onClick={() => handleDismiss(true)}
            className="text-[11px] font-mono text-ocean-muted hover:text-ocean-text underline"
          >
            {t.onboarding.dontShowAgain}
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface text-xs font-mono text-ocean-muted hover:text-ocean-text transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t.onboarding.back}
              </button>
            )}

            <button
              onClick={() => {
                if (isLastStep) {
                  handleDismiss(true);
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-ocean-cyan hover:bg-ocean-cyan/90 text-ocean-abyss font-bold text-xs font-mono transition-colors flex items-center gap-1 shadow-md shadow-ocean-cyan/20"
            >
              {isLastStep ? (
                <>
                  {t.onboarding.gotIt}
                  <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  {t.onboarding.next}
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
