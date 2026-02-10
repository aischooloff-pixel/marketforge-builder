import { ShieldX } from 'lucide-react';

export const BannedScreen = ({ reason }: { reason?: string }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Аккаунт заблокирован</h1>
        <p className="text-muted-foreground text-sm">
          Ваш аккаунт был заблокирован администрацией.
          {reason && <> Причина: <span className="text-foreground font-medium">{reason}</span></>}
        </p>
        <p className="text-muted-foreground text-xs">
          Если вы считаете, что это ошибка, обратитесь в поддержку.
        </p>
      </div>
    </div>
  );
};
