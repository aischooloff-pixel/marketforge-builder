import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PromoFormData {
  code: string;
  discount_percent: number;
  max_uses: number;
  expires_at?: string;
}

interface PromoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PromoFormData) => Promise<void>;
  isLoading?: boolean;
}

export const PromoFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: PromoFormDialogProps) => {
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    await onSubmit({
      code: code.trim().toUpperCase(),
      discount_percent: discountPercent,
      max_uses: maxUses,
      expires_at: expiresAt || undefined,
    });
    setCode('');
    setDiscountPercent(10);
    setMaxUses(100);
    setExpiresAt('');
    onOpenChange(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый промокод</DialogTitle>
          <DialogDescription>
            Создайте промокод со скидкой в процентах
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Код</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="SALE2024"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button type="button" variant="outline" size="sm" onClick={generateCode}>
                Сгенерировать
              </Button>
            </div>
          </div>

          <div>
            <Label>Скидка (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Макс. использований</Label>
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Действует до (необязательно)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isLoading || !code.trim()}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Создать промокод
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
