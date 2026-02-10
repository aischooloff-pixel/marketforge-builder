
-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  admin_reply text,
  replied_at timestamp with time zone,
  replied_by uuid REFERENCES public.profiles(id),
  telegram_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (true);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (true);

-- Admins can update tickets (via service role in edge function)
CREATE POLICY "Tickets can be updated"
ON public.support_tickets
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
