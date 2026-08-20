-- Fix: column-level REVOKE UPDATE (is_staff) never actually restricted
-- anything, because Supabase grants `authenticated` a table-level UPDATE on
-- profiles by default, and that broader grant still covers is_staff
-- regardless of the column-level revoke. A trigger is the reliable guard:
-- it works no matter what table/column grants exist, by resetting is_staff
-- back to its previous value whenever a non-service-role caller tries to
-- change it.
CREATE OR REPLACE FUNCTION public.prevent_is_staff_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_staff IS DISTINCT FROM OLD.is_staff AND auth.role() <> 'service_role' THEN
    NEW.is_staff := OLD.is_staff;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_is_staff
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_staff_self_escalation();
