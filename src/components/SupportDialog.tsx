import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const SupportDialog = () => {
  const { user } = useTelegram();
  const admin = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tab, setTab] = useState<'new' | 'history'>('new');

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id && isOpen,
  });

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user?.id) return;
    setIsSending(true);
    try {
      await admin.createTicket(user.id, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      setTab('history');
      refetch();
    } catch {
      toast.error('Ошибка отправки');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      open: { variant: 'outline', label: 'Открыт' },
      answered: { variant: 'default', label: 'Отвечен' },
      closed: { variant: 'secondary', label: 'Закрыт' },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <MessageCircle className="h-4 w-4" />
          Написать в поддержку
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Поддержка</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('new')}
          >
            Новое обращение
          </Button>
          <Button
            variant={tab === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('history')}
          >
            Мои обращения {tickets.length > 0 && `(${tickets.length})`}
          </Button>
        </div>

        {tab === 'new' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Тема</label>
              <Input
                placeholder="Кратко опишите проблему"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Сообщение</label>
              <Textarea
                placeholder="Подробно опишите вашу проблему..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>
            <Button
              className="w-full gap-2"
              disabled={!subject.trim() || !message.trim() || isSending}
              onClick={handleSubmit}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Отправить
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                У вас пока нет обращений
              </p>
            ) : (
              tickets.map((t: any) => (
                <div key={t.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{t.subject}</p>
                    {getStatusBadge(t.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.message}</p>
                  {t.admin_reply && (
                    <div className="p-2 rounded bg-primary/10 mt-2">
                      <p className="text-xs font-medium text-primary mb-1">Ответ поддержки:</p>
                      <p className="text-xs">{t.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
