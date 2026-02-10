import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, Trash2, Image, Video, FileText, Loader2, Eye, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InlineButton {
  text: string;
  url: string;
}

interface BroadcastTabProps {
  onSend: (data: {
    text: string;
    media_url?: string;
    media_type?: string;
    parse_mode: string;
    buttons?: InlineButton[];
  }) => Promise<{ success: boolean; sent: number; failed: number; total: number } | null>;
  totalUsers: number;
}

export const BroadcastTab = ({ onSend, totalUsers }: BroadcastTabProps) => {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<string>('photo');
  const [parseMode, setParseMode] = useState('HTML');
  const [buttons, setButtons] = useState<InlineButton[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addButton = () => {
    setButtons([...buttons, { text: '', url: '' }]);
  };

  const updateButton = (index: number, field: 'text' | 'url', value: string) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!text && !mediaUrl) {
      toast.error('Добавьте текст или медиа');
      return;
    }

    const validButtons = buttons.filter(b => b.text && b.url);

    setSending(true);
    try {
      const result = await onSend({
        text,
        media_url: mediaUrl || undefined,
        media_type: mediaUrl ? mediaType : undefined,
        parse_mode: parseMode,
        buttons: validButtons.length > 0 ? validButtons : undefined,
      });

      if (result?.success) {
        toast.success(`Рассылка завершена: ${result.sent} из ${result.total} доставлено`);
        if (result.failed > 0) {
          toast.warning(`Не удалось доставить: ${result.failed}`);
        }
        setText('');
        setMediaUrl('');
        setButtons([]);
      }
    } catch {
      toast.error('Ошибка рассылки');
    } finally {
      setSending(false);
    }
  };

  const formatHints = parseMode === 'HTML' 
    ? ['<b>жирный</b>', '<i>курсив</i>', '<u>подчёркнутый</u>', '<s>зачёркнутый</s>', '<code>код</code>', '<a href="url">ссылка</a>']
    : ['*жирный*', '_курсив_', '~зачёркнутый~', '`код`', '[ссылка](url)'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Рассылка</h2>
          <p className="text-sm text-muted-foreground">Отправка сообщения всем пользователям ({totalUsers})</p>
        </div>
      </div>

      {/* Text */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Текст сообщения
          </Label>
          <Select value={parseMode} onValueChange={setParseMode}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HTML">HTML</SelectItem>
              <SelectItem value="MarkdownV2">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите текст рассылки..."
          className="min-h-[120px] font-mono text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {formatHints.map((hint, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-mono cursor-pointer" onClick={() => {
              setText(prev => prev + hint);
            }}>
              {hint}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Media */}
      <Card className="p-4 space-y-3">
        <Label className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Медиа (необязательно)
        </Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Auto-detect media type
            if (file.type.startsWith('video/')) {
              setMediaType('video');
            } else if (file.type === 'image/gif') {
              setMediaType('gif');
            } else {
              setMediaType('photo');
            }

            setUploading(true);
            try {
              const ext = file.name.split('.').pop();
              const path = `broadcast/${Date.now()}.${ext}`;
              const { error: uploadErr } = await supabase.storage
                .from('product-media')
                .upload(path, file, { upsert: true });

              if (uploadErr) throw uploadErr;

              const { data: urlData } = supabase.storage
                .from('product-media')
                .getPublicUrl(path);

              setMediaUrl(urlData.publicUrl);
              toast.success('Файл загружен');
            } catch (err) {
              console.error(err);
              toast.error('Ошибка загрузки файла');
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
        <div className="flex gap-2">
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="URL или загрузите файл..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <Select value={mediaType} onValueChange={setMediaType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">
                <span className="flex items-center gap-1"><Image className="h-3 w-3" /> Фото</span>
              </SelectItem>
              <SelectItem value="video">
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Видео</span>
              </SelectItem>
              <SelectItem value="gif">
                <span className="flex items-center gap-1">GIF</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mediaUrl && mediaType === 'photo' && (
          <img src={mediaUrl} alt="preview" className="max-h-40 rounded-md object-cover" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        )}
        {mediaUrl && (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setMediaUrl('')}>
            <Trash2 className="h-3 w-3 mr-1" /> Удалить медиа
          </Button>
        )}
      </Card>

      {/* Buttons */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Inline-кнопки</Label>
          <Button variant="outline" size="sm" onClick={addButton}>
            <Plus className="h-3 w-3 mr-1" />
            Добавить
          </Button>
        </div>
        {buttons.map((btn, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={btn.text}
              onChange={(e) => updateButton(i, 'text', e.target.value)}
              placeholder="Текст кнопки"
              className="flex-1"
            />
            <Input
              value={btn.url}
              onChange={(e) => updateButton(i, 'url', e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => removeButton(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {buttons.length === 0 && (
          <p className="text-sm text-muted-foreground">Кнопки не добавлены</p>
        )}
      </Card>

      {/* Preview */}
      {showPreview && (text || mediaUrl) && (
        <Card className="p-4 space-y-2 border-primary/30 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground">Предпросмотр</p>
          {mediaUrl && mediaType === 'photo' && (
            <img src={mediaUrl} alt="media" className="max-h-48 rounded-md" />
          )}
          {text && (
            <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={parseMode === 'HTML' ? { __html: text } : undefined}>
              {parseMode !== 'HTML' ? text : undefined}
            </div>
          )}
          {buttons.filter(b => b.text).map((btn, i) => (
            <div key={i} className="border rounded-md p-2 text-center text-sm text-primary font-medium">
              {btn.text}
            </div>
          ))}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? 'Скрыть' : 'Предпросмотр'}
        </Button>
        <Button
          className="flex-1"
          onClick={handleSend}
          disabled={sending || (!text && !mediaUrl)}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {sending ? 'Отправка...' : `Отправить (${totalUsers})`}
        </Button>
      </div>
    </div>
  );
};
