
-- Create storage bucket for product media
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);

-- Public read access
CREATE POLICY "Product media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

-- Admin upload (open for now since TEMP_OPEN_ACCESS)
CREATE POLICY "Anyone can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Anyone can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media');

-- Add media column to products
ALTER TABLE public.products ADD COLUMN media_urls text[] DEFAULT '{}'::text[];
