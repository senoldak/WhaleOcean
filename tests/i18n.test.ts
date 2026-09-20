import { describe, it, expect } from 'vitest';
import { tr } from '../src/i18n/locales/tr';
import { en } from '../src/i18n/locales/en';

describe('Whale Ocean i18n & Turkish Translation Suite', () => {
  it('should have 100% key parity between TR and EN locales', () => {
    const checkKeys = (objA: any, objB: any, path = '') => {
      const keysA = Object.keys(objA).sort();
      const keysB = Object.keys(objB).sort();

      expect(keysA, `Keys mismatch at ${path}`).toEqual(keysB);

      for (const key of keysA) {
        const valA = objA[key];
        const valB = objB[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof valA === 'object' && valA !== null) {
          expect(typeof valB, `Type mismatch at ${currentPath}`).toBe('object');
          checkKeys(valA, valB, currentPath);
        } else {
          expect(typeof valA, `Value at ${currentPath} should be string`).toBe('string');
          expect(valA.length, `Value at ${currentPath} in TR should not be empty`).toBeGreaterThan(0);
          expect(typeof valB, `Value at ${currentPath} should be string`).toBe('string');
          expect(valB.length, `Value at ${currentPath} in EN should not be empty`).toBeGreaterThan(0);
        }
      }
    };

    checkKeys(tr, en);
  });

  it('should verify professional financial and ocean terminology in Turkish', () => {
    expect(tr.nav.tagline).toBe('Fiyata bakma. Okyanusu izle.');
    expect(tr.nav.compass).toBe('PUSULA');
    expect(tr.nav.sonar).toBe('SONAR');
    expect(tr.nav.helm).toBe('DÜMEN');

    expect(tr.compass.title).toBe('Balina Alpha Radarı');
    expect(tr.compass.alphaScore).toBe('Okyanus Alpha Puanı');
    expect(tr.compass.circuitBreakerNotice).toContain('%15');

    expect(tr.sonar.title).toBe('Kantitatif Backtest Laboratuvarı');
    expect(tr.sonar.slippage).toContain('Fiyat Kayması');
    expect(tr.sonar.statsMaxDrawdown).toContain('Maksimum Düşüş');

    expect(tr.helm.title).toBe('Sanal İşlem Operasyon Güvertesi');
    expect(tr.helm.balance).toContain('Sanal Nakit Bakiye');
    expect(tr.helm.marginUsed).toContain('Kullanılan Marjin');
    expect(tr.helm.freeCollateral).toContain('Serbest Teminat');

    expect(tr.ocean.density).toBe('Okyanus Yoğunluğu');
    expect(tr.ocean.waterPressure).toContain('Su Basıncı');
    expect(tr.ocean.whaleDelta).toContain('Balina Akıntısı');
  });

  it('should verify new modules in TR and EN dictionaries', () => {
    expect(tr.pods.title).toBe('BALİNA SÜRÜLERİ • SENDİKA KÜMELERİ');
    expect(tr.hunt.title).toBe('TASFİYE AVI • KARŞI POZİSYONLANMA');
    expect(tr.trails.title).toBe('BALİNA İZLERİ • DENETİM AKIŞI');
    expect(tr.reef.title).toBe('LİKİDİTE RESİFLERİ • PİYASA DERİNLİK BARİYERLERİ');
    expect(tr.migration.title).toBe('SERMAYE GÖÇÜ • VARLIKLAR ARASI ROTASYON');
    expect(tr.graveyard.title).toBe('TASFİYE MEZARLIĞI • SU ALTINDAKİ BALİNALAR');

    expect(en.pods.title).toBe('WHALE PODS • SYNDICATE CLUSTERS');
    expect(en.hunt.title).toBe('LIQUIDATION HUNT • COUNTER-POSITIONING');
    expect(en.trails.title).toBe('WHALE TRAILS • AUDIT STREAM');
    expect(en.reef.title).toBe('LIQUIDITY REEF • MARKET DEPTH BARRIERS');
    expect(en.migration.title).toBe('CAPITAL MIGRATION • CROSS-ASSET ROTATION');
    expect(en.graveyard.title).toBe('LIQUIDATION GRAVEYARD • UNDERWATER WHALES');
  });
});

