-- ============================================================
-- Migration 037: Super admin helper function
--
-- Run AFTER a user signs up so admins can elevate any registered
-- user to the "owner" role, granting full permissions across
-- the account.
--
-- Usage (after user registers):
--   SELECT public.set_account_role('email@example.com', 'owner');
--
-- Or from the Supabase dashboard SQL editor with the service key.
-- ============================================================

-- Drop first so it's idempotent
DROP FUNCTION IF EXISTS public.set_account_role(TEXT, public.account_role_enum);

CREATE OR REPLACE FUNCTION public.set_account_role(
  target_email TEXT,
  new_role     public.account_role_enum
)
RETURNS TABLE(user_id UUID, email TEXT, account_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_account_id UUID;
  v_profile_id BIGINT;
BEGIN
  -- 1. Find the user by email in auth.users
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = target_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email
      USING HINT = 'The user must sign up via the app before calling this function.';
  END IF;

  -- 2. Check if they already have a profile
  SELECT p.id, p.account_id INTO v_profile_id, v_account_id
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  -- 3. If no profile, create one with a new account
  IF v_profile_id IS NULL THEN
    INSERT INTO public.accounts (name, owner_user_id)
    VALUES (target_email, v_user_id)
    RETURNING id INTO v_account_id;

    INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
    VALUES (v_user_id, '', target_email, v_account_id, new_role);
  ELSE
    -- 4. Profile exists — just update the role
    UPDATE public.profiles
    SET account_role = new_role
    WHERE id = v_profile_id;
  END IF;

  -- Return what was done
  RETURN QUERY
  SELECT
    v_user_id,
    target_email,
    new_role::TEXT;
END;
$$;

ALTER FUNCTION public.set_account_role(TEXT, public.account_role_enum) OWNER TO postgres;

-- Also add a convenience wrapper that defaults to 'owner'
DROP FUNCTION IF EXISTS public.make_super_admin(TEXT);

CREATE OR REPLACE FUNCTION public.make_super_admin(target_email TEXT)
RETURNS TABLE(user_id UUID, email TEXT, account_role TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.set_account_role(target_email, 'owner'::public.account_role_enum);
$$;

ALTER FUNCTION public.make_super_admin(TEXT) OWNER TO postgres;
