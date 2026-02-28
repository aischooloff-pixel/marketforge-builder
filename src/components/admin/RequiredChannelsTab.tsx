import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Channel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_url: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  invokeAdminApi: <T>(path: string, method?: string, body?: Record<string, unknown>) => Promise<T | null>;
}

export const RequiredChannelsTab = ({ invokeAdminApi }: Props) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');

  const loadChannels = async () => {
    setLoading(true);
    const data = await invokeAdminApi<Channel[]>('/required-channels', 'GET');
    if (data) setChannels(data);
    setLoading(false);
  };

  useEffect(() => { loadChannels(); }, []);

  const handleAdd = async () => {
    if (!newChannelId || !newChannelName || !newChannelUrl) {
      toast.error('Заполните все поля');
      return;
    }
    setAdding(true);
    const result = await invokeAdminApi<Channel>('/required-channels', 'POST', {
      channel_id: newChannelId,
      channel_name: newChannelName,
      channel_url: newChannelUrl,
    });
    if (result) {
      toast.success('Канал добавлен');
      setNewChannelId('');
      setNewChannelName('');
      setNewChannelUrl('');
      await loadChannels();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить обязательный канал?')) return;
    const result = await invokeAdminApi<{ success: boolean }>(`/required-channels/${id}`, 'DELETE');
    if (result?.success) {
      toast.success('Канал удалён');
      await loadChannels();
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await invokeAdminApi(`/required-channels/${id}`, 'PUT', { is_active: !isActive });
    await loadChannels();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Обязательные подписки ({channels.length})</h2>
      <p className="text-sm text-muted-foreground">
        Пользователи должны подписаться на все каналы перед использованием бота. 
        Бот должен быть админом в канале для проверки подписки.
      </p>

      {/* Add form */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Добавить канал</h3>
        <Input
          placeholder="ID канала (напр. @channel или -1001234567890)"
          value={newChannelId}
          onChange={(e) => setNewChannelId(e.target.value)}
        />
        <Input
          placeholder="Название (напр. TEMKA News)"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
        />
        <Input
          placeholder="Ссылка (напр. https://t.me/TemkaStoreNews)"
          value={newChannelUrl}
          onChange={(e) => setNewChannelUrl(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={adding} size="sm">
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Добавить
        </Button>
      </Card>

      {/* Channel list */}
      {channels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Обязательных каналов нет — бот работает без проверки подписки</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Card key={ch.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{ch.channel_name}</p>
                      {!ch.is_active && <Badge variant="secondary" className="text-xs">Выключен</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ch.channel_id}</p>
                    <a href={ch.channel_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {ch.channel_url}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(ch.id, ch.is_active)}
                  >
                    {ch.is_active ? 'Выкл' : 'Вкл'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
