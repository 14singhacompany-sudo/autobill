-- Every account needs company_settings because all four document tables use it.
INSERT INTO public.company_settings (
  user_id, company_name, phone, email, entity_type, vat_registered
)
SELECT
  profile.id,
  coalesce(nullif(company.name, ''), 'บริษัทของฉัน'),
  coalesce(profile.phone, ''),
  profile.email,
  CASE
    WHEN auth_user.raw_user_meta_data->>'entity_type' IN ('individual', 'juristic', 'partnership')
      THEN auth_user.raw_user_meta_data->>'entity_type'
    ELSE NULL
  END,
  CASE
    WHEN auth_user.raw_user_meta_data->>'vat_registered' IN ('true', 'false')
      THEN (auth_user.raw_user_meta_data->>'vat_registered')::boolean
    ELSE NULL
  END
FROM public.profiles AS profile
JOIN auth.users AS auth_user ON auth_user.id = profile.id
LEFT JOIN public.companies AS company ON company.user_id = profile.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings AS settings WHERE settings.user_id = profile.id
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_name text;
  business_type text;
  is_vat_registered boolean;
BEGIN
  business_name := coalesce(nullif(NEW.raw_user_meta_data->>'company_name', ''), 'บริษัทของฉัน');
  business_type := CASE
    WHEN NEW.raw_user_meta_data->>'entity_type' IN ('individual', 'juristic', 'partnership')
      THEN NEW.raw_user_meta_data->>'entity_type'
    ELSE NULL
  END;
  is_vat_registered := CASE
    WHEN NEW.raw_user_meta_data->>'vat_registered' IN ('true', 'false')
      THEN (NEW.raw_user_meta_data->>'vat_registered')::boolean
    ELSE NULL
  END;

  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'phone', '')
  );

  INSERT INTO public.companies (user_id, name)
  VALUES (NEW.id, business_name);

  INSERT INTO public.company_settings (
    user_id, company_name, phone, email, entity_type, vat_registered
  )
  VALUES (
    NEW.id,
    business_name,
    coalesce(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    business_type,
    is_vat_registered
  );

  RETURN NEW;
END;
$$;
