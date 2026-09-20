import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Navbar } from '../src/components/layout/Navbar';
import { PersonaBadge } from '../src/components/common/PersonaBadge';
import { AlphaScoreBadge } from '../src/components/common/AlphaScoreBadge';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/compass',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('Navbar Navigation & Shared Badges', () => {
  it('should render COMPASS, SONAR, and HELM links in Navbar with TR default', () => {
    const html = renderToStaticMarkup(<Navbar />);
    expect(html).toContain('PUSULA');
    expect(html).toContain('href="/compass"');
    expect(html).toContain('SONAR');
    expect(html).toContain('href="/sonar"');
    expect(html).toContain('DÜMEN');
    expect(html).toContain('href="/helm"');
    expect(html).toContain('TR');
    expect(html).toContain('EN');
  });

  it('should render PersonaBadge with appropriate persona styling', () => {
    const htmlTriton = renderToStaticMarkup(<PersonaBadge persona="TRITON" />);
    expect(htmlTriton).toContain('TRITON');
    expect(htmlTriton).toContain('Taşıma');

    const htmlOrca = renderToStaticMarkup(<PersonaBadge persona="ORCA" />);
    expect(htmlOrca).toContain('ORCA');
    expect(htmlOrca).toContain('Trend');

    const htmlLeviathan = renderToStaticMarkup(<PersonaBadge persona="LEVIATHAN" />);
    expect(htmlLeviathan).toContain('LEVIATHAN');
    expect(htmlLeviathan).toContain('Fırtına');
  });

  it('should render AlphaScoreBadge with score value and grade color', () => {
    const htmlHigh = renderToStaticMarkup(<AlphaScoreBadge score={92.5} size="md" />);
    expect(htmlHigh).toContain('92.5');

    const htmlLow = renderToStaticMarkup(<AlphaScoreBadge score={45.0} size="sm" />);
    expect(htmlLow).toContain('45.0');
  });
});
