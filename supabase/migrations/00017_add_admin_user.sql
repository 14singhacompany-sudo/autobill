-- Add admin user for 14singhacompany@gmail.com
-- This ensures admin access works even without ADMIN_EMAILS env var

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user_id from auth.users by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = '14singhacompany@gmail.com'
    LIMIT 1;

    -- Only insert if user exists and not already an admin
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.admins (user_id, role, created_at)
        VALUES (v_user_id, 'super_admin', NOW())
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE 'Admin added for user_id: %', v_user_id;
    ELSE
        RAISE NOTICE 'User not found with email 14singhacompany@gmail.com';
    END IF;
END $$;
