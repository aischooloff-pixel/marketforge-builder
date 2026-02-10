import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

interface SupportTicketsTabProps {
  tickets: any[];
  onReply: (ticketId: string, reply: string) => Promise<boolean>;
  onUpdateStatus: (ticketId: string, status: string) => Promise<any>;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SupportTicketsTab = ({ tickets, onReply, onUpdateStatus, isLoading, onRefresh }: SupportTicketsTabProps) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    const success = await onReply(selectedTicket.id, replyText.trim());
    if (success) {
      setReplyText('');
      setReplyOpen(false);
      onRefresh();
    }
  };

  const handleClose = async (ticketId: string) => {
    await onUpdateStatus(ticketId, 'closed');
    onRefresh();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      open: { variant: 'destructive', label: 'Открыт' },
      answered: { variant: 'default', label: 'Отвечен' },
      closed: { variant: 'secondary', label: 'Закрыт' },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
  };

  const openTickets = tickets.filter(t => t.status === 'open');
  const otherTickets = tickets.filter(t => t.status !== 'open');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Обращения ({tickets.length})
          {openTickets.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">{openTickets.length} новых</Badge>
          )}
        </h2>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Обращений пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...openTickets, ...otherTickets].map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{ticket.subject}</p>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ticket.profiles?.username ? `@${ticket.profiles.username}` : ticket.profiles?.first_name || 'Unknown'}
                    {' · '}
                    {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <p className="text-sm mb-2">{ticket.message}</p>

              {ticket.admin_reply && (
                <div className="p-2 rounded bg-primary/10 mb-2">
                  <p className="text-xs font-medium text-primary mb-1">Ваш ответ:</p>
                  <p className="text-xs">{ticket.admin_reply}</p>
                  {ticket.telegram_sent && (
                    <p className="text-xs text-muted-foreground mt-1">✓ Отправлено в Telegram</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {ticket.status === 'open' && (
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => { setSelectedTicket(ticket); setReplyText(''); setReplyOpen(true); }}
                  >
                    <Send className="h-3 w-3" /> Ответить
                  </Button>
                )}
                {ticket.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClose(ticket.id)}
                    disabled={isLoading}
                  >
                    Закрыть
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ответ на обращение</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-secondary/50">
                <p className="text-sm font-medium">{selectedTicket.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedTicket.message}</p>
              </div>
              <Textarea
                placeholder="Введите ответ..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Ответ будет отправлен пользователю в Telegram
              </p>
              <Button
                className="w-full gap-2"
                disabled={!replyText.trim() || isLoading}
                onClick={handleReply}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Отправить ответ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
