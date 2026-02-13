import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ImagePlus, X, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const productSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  short_desc: z.string().optional(),
  long_desc: z.string().optional(),
  price: z.coerce.number().min(0, 'Цена должна быть положительной'),
  category_id: z.string().optional(),
  type: z.enum(['one-time', 'subscription']).default('one-time'),
  is_active: z.boolean().default(true),
  is_popular: z.boolean().default(false),
  tags: z.string().optional(),
  max_per_user: z.coerce.number().min(0).default(0),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Product {
  id: string;
  name: string;
  short_desc?: string;
  long_desc?: string;
  price: number;
  category_id?: string;
  type: string;
  is_active: boolean;
  is_popular: boolean;
  tags?: string[];
  media_urls?: string[];
  max_per_user?: number;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: Partial<Product>) => Promise<void>;
  isLoading?: boolean;
}

export const ProductFormDialog = ({
  open,
  onOpenChange,
  product,
  categories,
  onSubmit,
  isLoading,
}: ProductFormDialogProps) => {
  const isEditing = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      short_desc: '',
      long_desc: '',
      price: 0,
      category_id: 'none',
      type: 'one-time',
      is_active: true,
      is_popular: false,
      tags: '',
      max_per_user: 0,
    },
  });

  // API tags that must be preserved and hidden from the editable field
  const API_TAG_PREFIX = 'api:';
  const [protectedTags, setProtectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      const apiTags = product.tags?.filter(t => t.startsWith(API_TAG_PREFIX)) || [];
      const userTags = product.tags?.filter(t => !t.startsWith(API_TAG_PREFIX)) || [];
      setProtectedTags(apiTags);
      form.reset({
        name: product.name,
        short_desc: product.short_desc || '',
        long_desc: product.long_desc || '',
        price: product.price,
        category_id: product.category_id || 'none',
        type: product.type as 'one-time' | 'subscription',
        is_active: product.is_active,
        is_popular: product.is_popular,
        tags: userTags.join(', '),
        max_per_user: product.max_per_user ?? 0,
      });
      setMediaUrls(product.media_urls || []);
    } else {
      setProtectedTags([]);
      form.reset({
        name: '',
        short_desc: '',
        long_desc: '',
        price: 0,
        category_id: 'none',
        type: 'one-time',
        is_active: true,
        is_popular: false,
        tags: '',
        max_per_user: 0,
      });
      setMediaUrls([]);
    }
  }, [product, open, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: только изображения и видео`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: макс. размер 50 МБ`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('product-media')
        .upload(path, file);

      if (error) {
        toast.error(`Ошибка загрузки ${file.name}`);
        console.error(error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('product-media')
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    setMediaUrls(prev => [...prev, ...newUrls]);
    if (newUrls.length > 0) toast.success(`Загружено: ${newUrls.length} файл(ов)`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (url: string) => {
    setMediaUrls(prev => prev.filter(u => u !== url));
  };

  const isVideoUrl = (url: string) => {
    return /\.(mp4|webm|mov|avi)$/i.test(url);
  };

  const handleSubmit = async (data: ProductFormData) => {
    const userTags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => Boolean(t) && !t.startsWith(API_TAG_PREFIX)) : [];
    const mergedTags = [...protectedTags, ...userTags];

    const productData: Partial<Product> = {
      name: data.name,
      short_desc: data.short_desc,
      long_desc: data.long_desc,
      price: data.price,
      category_id: data.category_id && data.category_id !== 'none' ? data.category_id : undefined,
      type: data.type,
      is_active: data.is_active,
      is_popular: data.is_popular,
      tags: mergedTags,
      media_urls: mediaUrls,
      max_per_user: data.max_per_user,
    };

    await onSubmit(productData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать товар' : 'Новый товар'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input placeholder="Название товара" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_desc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Краткое описание</FormLabel>
                  <FormControl>
                    <Input placeholder="Краткое описание для каталога" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="long_desc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Полное описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Подробное описание товара..."
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media Upload */}
            <div>
              <FormLabel>Медиа (фото / видео)</FormLabel>
              <div className="mt-2 space-y-2">
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaUrls.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border aspect-square bg-muted">
                        {isVideoUrl(url) ? (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <Film className="h-6 w-6 text-muted-foreground" />
                          </div>
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(url)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Загрузка...' : 'Добавить медиа'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Без категории</SelectItem>
                        {categories.filter(cat => cat.id).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="one-time">Разовая покупка</SelectItem>
                      <SelectItem value="subscription">Подписка</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_per_user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Лимит покупок на пользователя</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Без ограничений</SelectItem>
                      <SelectItem value="1">Только 1 раз</SelectItem>
                      <SelectItem value="2">Макс. 2 раза</SelectItem>
                      <SelectItem value="3">Макс. 3 раза</SelectItem>
                      <SelectItem value="5">Макс. 5 раз</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Теги (через запятую)</FormLabel>
                  <FormControl>
                    <Input placeholder="популярное, акция, новинка" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Активен</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_popular"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Популярное</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
