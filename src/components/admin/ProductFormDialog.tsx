import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

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
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        short_desc: product.short_desc || '',
        long_desc: product.long_desc || '',
        price: product.price,
        category_id: product.category_id || 'none',
        type: product.type as 'one-time' | 'subscription',
        is_active: product.is_active,
        is_popular: product.is_popular,
        tags: product.tags?.join(', ') || '',
      });
    } else {
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
      });
    }
  }, [product, open, form]);

  const handleSubmit = async (data: ProductFormData) => {
    const productData: Partial<Product> = {
      name: data.name,
      short_desc: data.short_desc,
      long_desc: data.long_desc,
      price: data.price,
      category_id: data.category_id && data.category_id !== 'none' ? data.category_id : undefined,
      type: data.type,
      is_active: data.is_active,
      is_popular: data.is_popular,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (₽) *</FormLabel>
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
