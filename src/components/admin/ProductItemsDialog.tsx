import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, Package, CheckCircle2, XCircle, FileUp, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductItem {
  id: string;
  content: string;
  file_url?: string;
  is_sold: boolean;
  sold_at?: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface ProductItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onFetchItems: (productId: string) => Promise<unknown>;
  onAddItems: (productId: string, items: string[]) => Promise<boolean>;
  onAddFileItems?: (productId: string, fileItems: Array<{ content: string; file_url: string }>) => Promise<boolean>;
  isLoading?: boolean;
}

export const ProductItemsDialog = ({
  open,
  onOpenChange,
  product,
  onFetchItems,
  onAddItems,
  onAddFileItems,
  isLoading,
}: ProductItemsDialogProps) => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [newItemsText, setNewItemsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && product) {
      loadItems();
    }
  }, [open, product]);

  const loadItems = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const data = await onFetchItems(product.id);
      if (Array.isArray(data)) {
        setItems(data as ProductItem[]);
      }
    } catch (e) {
      console.error('Failed to load items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItems = async () => {
    if (!product || !newItemsText.trim()) return;

    const lines = newItemsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    setLoading(true);
    try {
      const success = await onAddItems(product.id, lines);
      if (success) {
        setNewItemsText('');
        // Reload items after successful add
        const data = await onFetchItems(product.id);
        if (Array.isArray(data)) {
          setItems(data as ProductItem[]);
        }
        setActiveTab('available');
      }
    } catch (e) {
      console.error('Failed to add items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !product) return;

    setUploading(true);
    const fileItems: Array<{ content: string; file_url: string }> = [];

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: макс. 50 МБ`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const path = `${product.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('delivery-files')
        .upload(path, file);

      if (error) {
        toast.error(`Ошибка загрузки ${file.name}`);
        console.error(error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('delivery-files')
        .getPublicUrl(path);

      fileItems.push({
        content: `📎 ${file.name}`,
        file_url: urlData.publicUrl,
      });
    }

    if (fileItems.length > 0 && onAddFileItems) {
      const success = await onAddFileItems(product.id, fileItems);
      if (success) {
        toast.success(`Загружено файлов: ${fileItems.length}`);
        // Reload items after successful upload
        const data = await onFetchItems(product.id);
        if (Array.isArray(data)) {
          setItems(data as ProductItem[]);
        }
        setActiveTab('available');
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const availableItems = items.filter(item => !item.is_sold);
  const soldItems = items.filter(item => item.is_sold);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Позиции: {product?.name}
          </DialogTitle>
          <DialogDescription>
            Управление товарными позициями для автоматической выдачи
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              ({availableItems.length})
            </TabsTrigger>
            <TabsTrigger value="sold" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              ({soldItems.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Текст
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs">
              <FileUp className="h-3 w-3 mr-1" />
              Файлы
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <TabsContent value="available" className="flex-1 mt-4">
                {availableItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Нет доступных позиций</p>
                    <p className="text-xs mt-1">Добавьте позиции во вкладке "Текст" или "Файлы"</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {availableItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border bg-muted/30 font-mono text-sm break-all"
                        >
                          <div className="flex items-center gap-2">
                            {item.file_url && <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                            <span>{item.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="sold" className="flex-1 mt-4">
                {soldItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Нет проданных позиций</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {soldItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border bg-muted/50"
                        >
                          <div className="font-mono text-sm break-all text-muted-foreground line-through flex items-center gap-2">
                            {item.file_url && <File className="h-4 w-4 flex-shrink-0" />}
                            {item.content}
                          </div>
                          {item.sold_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Продано: {new Date(item.sold_at).toLocaleString('ru-RU')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="add" className="flex-1 mt-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Вставьте данные для выдачи — каждая строка = одна позиция товара
                  </p>
                  <Textarea
                    placeholder={`Пример:\nlogin1:password1\nlogin2:password2\nlogin3:password3`}
                    value={newItemsText}
                    onChange={(e) => setNewItemsText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    Строк: {newItemsText.split('\n').filter(l => l.trim()).length}
                  </Badge>
                  <Button
                    onClick={handleAddItems}
                    disabled={isLoading || loading || !newItemsText.trim()}
                  >
                    {(isLoading || loading) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 mt-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Загрузите файлы любого типа для автоматической выдачи покупателю через Telegram-бота.
                    Каждый файл = одна позиция товара.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-32 border-dashed flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-sm">Загрузка файлов...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Нажмите для выбора файлов (макс. 50 МБ)
                        </span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Поддерживаются любые типы файлов</p>
                  <p>• Файлы будут отправлены покупателю в ЛС Telegram-бота</p>
                  <p>• Каждый загруженный файл = 1 единица товара</p>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
