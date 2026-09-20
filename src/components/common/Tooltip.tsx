'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  methodologyLink?: boolean;
}

export function Tooltip({ content, children, methodologyLink = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        className="cursor-help flex items-center"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        role="button"
        aria-label={content}
      >
        {children || <Info className="w-3.5 h-3.5 text-ocean-muted hover:text-ocean-cyan transition-colors ml-1" />}
      </div>

      {isVisible && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-ocean-surface border border-ocean-border rounded-lg text-xs text-ocean-text shadow-xl backdrop-blur-sm pointer-events-none"
          role="tooltip"
        >
          <div className="leading-relaxed">{content}</div>
          {methodologyLink && (
            <div className="mt-1.5 pt-1.5 border-t border-ocean-border text-[10px] text-ocean-cyan">
              Source: Official Hyperliquid API
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ocean-surface" />
        </div>
      )}
    </div>
  );
}
