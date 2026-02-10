
-- Create storage bucket for delivery files
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-files', 'delivery-files', false);

-- Only service role can upload (via admin-api)
CREATE POLICY "Delivery files upload by anyone"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-files');

-- Owners can download their purchased files
CREATE POLICY "Delivery files download by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-files');

-- Add file_url column to product_items
ALTER TABLE public.product_items ADD COLUMN file_url text;
