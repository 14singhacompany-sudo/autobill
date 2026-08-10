-- Direct email delivery is postponed until a verified sending domain is configured.
UPDATE public.plans
SET features = features
  - 'ส่งอีเมล'
  - 'ส่งอีเมลให้ลูกค้า'
  - 'ส่งใบเสนอราคาและใบแจ้งหนี้ทางอีเมล'
WHERE features ?| ARRAY[
  'ส่งอีเมล',
  'ส่งอีเมลให้ลูกค้า',
  'ส่งใบเสนอราคาและใบแจ้งหนี้ทางอีเมล'
];
