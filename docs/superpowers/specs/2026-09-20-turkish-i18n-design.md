# Eksiksiz ve Kusursuz Türkçe Dil Desteği Tasarımı (Turkish i18n Design)

- **Tarih:** 2026-09-20
- **Durum:** Onaylandı
- **Kapsam:** Whale Ocean terminali genelinde %100 dinamik Türkçe ve İngilizce dil desteği, sıfır hardcoded metin, katı tip güvenliği ve key parity.

---

## 1. Problem Tanımı ve Hedef

Whale Ocean; Hyperliquid L1 protokolündeki balina cüzdanlarını, likidite resiflerini, açık pozisyon yoğunluğunu ve tasfiye risklerini analiz eden kurumsal düzeyde bir piyasa istihbarat terminalidir.
Mevcut durumda temel bir `LanguageContext` ve `tr.ts` / `en.ts` sözlükleri bulunsa da:
1. **Pods (Sürüler), Hunt (Tasfiye Avı), Trails (İzler), Reef (Resifler), Migration (Sermaye Göçü), Graveyard (Mezarlık)** modülleri sözlükte yer almamakta ve bileşenlerinde tamamen sabit İngilizce metinler kullanılmaktadır.
2. Sayfa düzeyindeki (`src/app/*`) başlıklar ve kümülatif istatistik blokları Server Component dosyalarında sabit İngilizce yazılmıştır.
3. Çeşitli bileşenlerde (`WhaleExposureCard`, `OceanConditionMeter`, `WhaleTable`, `WhaleDnaCard`, vb.) dağınık `language === 'tr' ? ... : ...` kontrolleri yer almakta, bu da kod kalitesini ve bakımını zorlaştırmaktadır.
4. Grafikler (`MarketChart`), ipuçları (`Tooltip`), "Neler Değişti" olay akışı (`WhatChangedFeed`), `OnboardingTour` ve `WhaleTrailsTimeline` içinde çevrilmemiş alanlar bulunmaktadır.

**Hedef:**
Tüm arayüzün (başlıklar, kartlar, tablolar, filtreler, modal pencereler, ipuçları, grafik etiketleri ve olay akışları) tek tıkla sayfa yenilenmeden dinamik olarak Türkçeye/İngilizceye geçebilmesini sağlamak, varsayılan dili kalıcı olarak Türkçe yapmak ve `tests/i18n.test.ts` ile %100 anahtar denkliği (key parity) garanti etmektir.

---

## 2. Mimari ve Sözlük Genişletmesi

### 2.1 `src/i18n/types.ts` Sözlük Arayüzü

`Translations` arayüzüne aşağıdaki yeni ve güncellenmiş modüller eklenir:

```typescript
export interface Translations {
  nav: { ... };
  common: { ... };
  ocean: {
    // Mevcut alanlara ek olarak kart ve grafik metrikleri:
    densityTooltip: string;
    densitySource: string;
    waterPressureTooltip: string;
    waterPressureAnnual: string;
    waterPressureExtreme: string;
    waterPressureSubtext: string;
    exposureTooltip: string;
    exposureLargest: string;
    exposureDisclaimer: string;
    waitingData: string;
    chartTitle: string;
    chartObservations: string;
    chartCollecting: string;
    chartSource: string;
    chartZeroSynthetic: string;
    feedFactual: string;
    feedEmptyDesc: string;
    feedSource: string;
    feedTimeAgo: string;
  };
  compass: { ... };
  sonar: { ... };
  helm: { ... };
  whales: {
    // Mevcut alanlara ek:
    colLargestPos: string;
    inspect: string;
    marketsCount: string;
    searchPlaceholder: string;
    modalLoading: string;
    modalActivePositions: string;
    modalSource: string;
    modalNoPositions: string;
    modalFirstObserved: string;
    modalLastObserved: string;
    modalCopyAddress: string;
    modalDisclaimer: string;
    modalNotFound: string;
    dnaObservedBehavior: string;
    dnaTooltip: string;
    dnaInsufficientDesc: string;
    timelineTitle: string;
    timelineEmpty: string;
    timelineRecorded: string;
  };
  markets: { ... };
  pods: {
    title: string;
    subtitle: string;
    totalExposure: string;
    detectedPods: string;
    largestPod: string;
    searchPlaceholder: string;
    allDirections: string;
    bullPods: string;
    bearPods: string;
    noPodsFound: string;
    observedWhales: string;
    avgLeverage: string;
    concordance: string;
    collectiveExposure: string;
    breakdown: string;
    dominantWhales: string;
    inspectMembers: string;
    hideMembers: string;
  };
  hunt: {
    title: string;
    subtitle: string;
    totalAtRisk: string;
    criticalZones: string;
    elevatedZones: string;
    searchPlaceholder: string;
    tierAll: string;
    tierCritical: string;
    tierElevated: string;
    tierModerate: string;
    tierDistant: string;
    noZonesFound: string;
    vulnerableAccounts: string;
    nearestGap: string;
    away: string;
    distant: string;
    longShortPools: string;
    longTrigger: string;
    shortTrigger: string;
    inspectPositions: string;
    hidePositions: string;
  };
  trails: {
    title: string;
    subtitle: string;
    deltaVolume: string;
    flips: string;
    largeEvents: string;
    searchPlaceholder: string;
    allSizes: string;
    tier10k: string;
    tier100k: string;
    tier500k: string;
    tier1m: string;
    noEventsFound: string;
    auditWallet: string;
    openProfile: string;
  };
  reef: {
    title: string;
    subtitle: string;
    totalDensity: string;
    deepReefs: string;
    fragileBarriers: string;
    searchPlaceholder: string;
    allReefs: string;
    deepReef: string;
    midReef: string;
    shallowReef: string;
    robust: string;
    stable: string;
    fragile: string;
    noBarriersFound: string;
    whaleConcentration: string;
    barrierHealth: string;
  };
  migration: {
    title: string;
    subtitle: string;
    grossInflow: string;
    grossOutflow: string;
    accumulatingAssets: string;
    searchPlaceholder: string;
    allFlows: string;
    accumulating: string;
    distributing: string;
    neutral: string;
    inflowLabel: string;
    outflowLabel: string;
    balancedLabel: string;
    noFlowsFound: string;
    activeWhales: string;
    eventCount: string;
  };
  graveyard: {
    title: string;
    subtitle: string;
    cumulativeLoss: string;
    criticalCasualties: string;
    highDistress: string;
    searchPlaceholder: string;
    allCasualties: string;
    criticalRisk: string;
    highDistressFilter: string;
    moderatePain: string;
    criticalBadge: string;
    highDistressBadge: string;
    moderatePainBadge: string;
    noCasualtiesFound: string;
    auditProfile: string;
    unrealizedLoss: string;
    notionalExposure: string;
    liquidationPrice: string;
    mortalityRisk: string;
    none: string;
  };
  methodology: { ... };
  search: { ... };
  watchlist: { ... };
  onboarding: { ... };
}
```

### 2.2 Çeviri Dosyaları (`tr.ts` & `en.ts`)
- `tr.ts`: Profesyonel ve tutarlı Türkçe terimler (Tasfiye, Açık Pozisyon, K/Z, Marjin, Fiyat Kayması, Kaldıraç, Okyanus Yoğunluğu, Su Basıncı, vb.).
- `en.ts`: Karşılık gelen İngilizce terimler.
- Her iki dosya arasında 1'e 1 anahtar denkliği (key parity) korunur.

---

## 3. Sayfa ve Bileşen Entegrasyonu

### 3.1 Başlıkların İstemci Bileşenlerine Taşınması
Aşağıdaki sayfalarda yer alan sabit İngilizce başlıklar ve istatistik çubukları, doğrudan ilgili istemci bileşeninin üst kısmına entegre edilir:
- `src/app/graveyard/page.tsx` -> `src/components/graveyard/GraveyardTable.tsx`
- `src/app/hunt/page.tsx` -> `src/components/hunt/HuntZones.tsx`
- `src/app/pods/page.tsx` -> `src/components/pods/PodGrid.tsx`
- `src/app/reef/page.tsx` -> `src/components/reef/ReefMatrix.tsx`
- `src/app/trails/page.tsx` -> `src/components/trails/TrailsStream.tsx`
- `src/app/whales/page.tsx` -> `src/components/whales/WhaleTable.tsx`
- `src/app/markets/page.tsx` -> `src/components/markets/MarketTable.tsx`
- `src/app/page.tsx` -> Dinamik `OceanDeckHeader` istemci bileşeni

### 3.2 Olay Akışı ve Analitik Dil Uyarlaması
`WhatChangedFeed.tsx` bileşeni, gelen doğrulanmış olayları aktif dile göre dinamik şablonla gösterir:
- **Pozisyon Değişimi:**
  - TR: `{cüzdan} cüzdanı {varlık} pozisyonunu ${tutar} artırdı / azalttı / yön değiştirdi.`
  - EN: `Observed wallet {cüzdan} increased/reduced exposure by ${tutar} in {varlık}.`
- **Açık Pozisyon Değişimi:**
  - TR: `{varlık} piyasasında Okyanus Yoğunluğu (OI) {oran}% ({tutar}) değişti.`
  - EN: `Ocean Density (OI) in {varlık} shifted by {oran}% ({tutar}).`

### 3.3 Kartlar ve Grafikler
- `OceanDensityCard.tsx`, `WaterPressureCard.tsx`, `WhaleExposureCard.tsx`, `MarketChart.tsx` ve `WhaleTrailsTimeline.tsx` içindeki tüm başlıklar, ipuçları ve kaynak metinleri `t.*` anahtarlarına bağlanır.

---

## 4. Doğrulama ve Test Planı

1. **Birim & Sözlük Testleri (`tests/i18n.test.ts`):**
   - TR ve EN sözlükleri arasında %100 key parity testi otomatik olarak tüm yeni modülleri doğrular.
   - Hiçbir anahtarın boş veya eksik olmadığını teyit eder.
2. **Görsel & UI Testleri:**
   - `tests/whales-view.test.tsx`, `tests/ocean-view.test.tsx`, `tests/navbar-navigation.test.tsx` testlerinin başarıyla geçtiği doğrulanır.
3. **Tam Test Paketi:**
   - `npm test` çalıştırılarak 26 test dosyasındaki 100+ testin eksiksiz yeşil yandığı teyit edilir.
