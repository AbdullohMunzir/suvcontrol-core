# Uzbekistan Water Utility B2B Billing Specifications

## 1. Consumer Categories & Business Rules

### 1.1. Budget Organizations (Byudjet Tashkilotlari)
* **Entities**: Public schools, state kindergartens, district hospitals, municipal departments.
* **Financial Rails**: Treasury single account (*G'aznachilik / UzASBO*) with 27-digit account strings (`23402...`).
* **Governance**: Strict annual and monthly volume ($m^3$) and budgetary ($UZS$) limits.
* **Alert Mechanism**: Automatic early warning thresholds at $80\%$ and $100\%$ limit consumption.

### 1.2. Commercial Enterprises (Tijorat Tashkilotlari)
* **Entities**: Supermarkets, hotels, restaurants, shopping centers, private offices.
* **Financial Rails**: Commercial banks (20-digit demand deposit accounts `20208...`).
* **Terms**: Advance payment models ($50\%$ or $100\%$), sub-metering reconciliation.
* **Taxation**: Soliq.uz 12% Value Added Tax (QQS) invoice clearance.

### 1.3. Industrial & Manufacturing (Sanoat va Ishlab Chiqarish)
* **Entities**: Textile plants, brick factories, poultry farms, car washes.
* **Sewage & Ecology**: Wastewater (*oqova suv / kanalizatsiya*) coefficient and industrial pollutant surcharge (*PDK / ПДК*).

---

## 2. Official Document Standards

The platform implements 5 official regulatory document generators:
1. **E-Hisobvaraq Faktura (EHF)**: 12% QQS calculation, MXIK/IKPU classification (`03600001001000000`), E-IMZO digital signature stamp.
2. **Akt-Sverka (Reconciliation Statement)**: Bilateral debit/credit balancing between supplier and consumer.
3. **Dalolatnoma (Sanction Act)**: Protocol for illegal connection or unsealed meter recalculation under VMQ-194.
4. **Spravka-Raschyot (Calculation Certificate)**: Official tariff and consumption breakdown for tax audit defense.
5. **Pretenziya (Pre-Trial Claim)**: Formal demand notice with grace periods and legal warnings.
