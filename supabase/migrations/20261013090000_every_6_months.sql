-- Billing cycle "Every 6 months" (e.g. school fees per term or semester). Month interval 6, notice default 7,
-- Keep quietly sends one reminder per renewal like Quarterly / Yearly (logic-spec §2.1, D5, D13).
alter type public.billing_cycle add value if not exists 'every_6_months' before 'yearly';
