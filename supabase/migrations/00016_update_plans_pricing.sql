-- Migration: Update plans pricing and features
-- All plans have AI feature, difference is only invoice/quotation limit
-- Prices: FREE=0, SOLO=199, PRO=299
-- All plans have 6 features for equal card height

-- Update FREE plan
UPDATE public.plans SET
    price_monthly = 0,
    description = 'เริ่มต้นใช้งาน',
    features = '[
        "20 บิล/เดือน",
        "20 ใบเสนอราคา/เดือน",
        "AI ดึงข้อมูลลูกค้า",
        "ดาวน์โหลด PDF",
        "ลูกค้า/สินค้าไม่จำกัด",
        "เก็บข้อมูลบน Cloud"
    ]'::jsonb
WHERE name = 'free';

-- Update SOLO plan
UPDATE public.plans SET
    price_monthly = 199,
    description = 'สำหรับ Freelancer',
    is_active = true,
    features = '[
        "100 บิล/เดือน",
        "100 ใบเสนอราคา/เดือน",
        "AI ดึงข้อมูลลูกค้า",
        "ดาวน์โหลด PDF",
        "ลูกค้า/สินค้าไม่จำกัด",
        "เก็บข้อมูลบน Cloud"
    ]'::jsonb
WHERE name = 'solo';

-- Update PRO plan
UPDATE public.plans SET
    price_monthly = 299,
    description = 'สำหรับธุรกิจที่เติบโต',
    features = '[
        "บิลไม่จำกัด",
        "ใบเสนอราคาไม่จำกัด",
        "AI ดึงข้อมูลลูกค้า",
        "ดาวน์โหลด PDF",
        "ลูกค้า/สินค้าไม่จำกัด",
        "ส่งอีเมลให้ลูกค้า"
    ]'::jsonb
WHERE name = 'pro';
