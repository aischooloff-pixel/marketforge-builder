
CREATE TABLE public.required_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.required_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Required channels are publicly viewable"
  ON public.required_channels
  FOR SELECT
  USING (is_active = true);
