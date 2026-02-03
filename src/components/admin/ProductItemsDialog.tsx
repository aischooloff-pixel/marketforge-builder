import { useState, useEffect } from 'react';
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
import { Loader2, Upload, Package, CheckCircle2, XCircle } from 'lucide-react';

interface ProductItem {
  id: string;
  content: string;
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
  isLoading?: boolean;
}

export const ProductItemsDialog = ({
  open,
  onOpenChange,
  product,
  onFetchItems,
  onAddItems,
  isLoading,
}: ProductItemsDialogProps) => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [newItemsText, setNewItemsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    if (open && product) {
      loadItems();
    }
  }, [open, product]);

  const loadItems = async () => {
    if (!product) return;
    setLoading(true);
    const data = await onFetchItems(product.id);
    if (data) {
      setItems(data as ProductItem[]);
    }
    setLoading(false);
  };

  const handleAddItems = async () => {
    if (!product || !newItemsText.trim()) return;

    const lines = newItemsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    setLoading(true);
    const success = await onAddItems(product.id, lines);
    if (success) {
      setNewItemsText('');
      await loadItems();
    }
    setLoading(false);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Доступно ({availableItems.length})
            </TabsTrigger>
            <TabsTrigger value="sold" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              Продано ({soldItems.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Добавить
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
                    <p className="text-xs mt-1">Добавьте позиции во вкладке "Добавить"</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {availableItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border bg-muted/30 font-mono text-sm break-all"
                        >
                          {item.content}
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
                          <div className="font-mono text-sm break-all text-muted-foreground line-through">
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
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
