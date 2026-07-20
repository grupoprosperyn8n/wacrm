'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChannelFormFields } from '@/components/channels/channel-form-fields';
import type { Channel, ChannelType } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Loader2, Trash2 } from 'lucide-react';

const TYPE_ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  facebook: '👍',
  instagram: '📸',
  web: '🌐',
};

const CHANNEL_TYPES: ChannelType[] = ['whatsapp', 'telegram', 'facebook', 'instagram', 'web'];

export default function ChannelDetailPage() {
  const t = useTranslations('Channels');
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const channelId = params.id as string;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [chanType, setChanType] = useState<ChannelType>('telegram');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();
      if (error || !data) {
        toast.error(t('detail.notFound'));
        router.push('/channels');
        return;
      }
      const ch = data as Channel;
      setChannel(ch);
      setName(ch.name);
      setChanType(ch.type);
      // Hydrate fieldValues from the stored config JSON
      const storedConfig = ch.config as Record<string, unknown>;
      const hydrated: Record<string, string> = {};
      for (const [key, val] of Object.entries(storedConfig)) {
        hydrated[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
      setFieldValues(hydrated);
      setIsActive(ch.is_active);
      setLoading(false);
    }
    load();
  }, [channelId, supabase, router]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!name.trim() || !channel) return;
    setSaving(true);

    // Build the JSON config from type-specific fields
    const parsedConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value.trim()) {
        parsedConfig[key] = value.trim();
      }
    }

    const { error } = await supabase
      .from('channels')
      .update({
        name: name.trim(),
        type: chanType,
        config: parsedConfig,
        is_active: isActive,
      })
      .eq('id', channelId);
    setSaving(false);
    if (error) {
      toast.error(t('form.toastError') + ': ' + error.message);
      return;
    }
    toast.success(t('form.toastUpdated'));
    setChannel({
      ...channel,
      name: name.trim(),
      type: chanType,
      config: parsedConfig,
      is_active: isActive,
    });
  };

  const handleDelete = async () => {
    if (!channel) return;
    setDeleting(true);
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    setDeleting(false);
    if (error) {
      toast.error(t('form.toastError') + ': ' + error.message);
      return;
    }
    toast.success(t('detail.deleteToast'));
    router.push('/channels');
    router.refresh();
  };

  const copyWebhookUrl = () => {
    if (!channel) return;
    const base = window.location.origin;
    const path =
      channel.type === 'web'
        ? '/api/receive/webchat'
        : `/api/receive/${channel.type}/${channel.id}`;
    navigator.clipboard.writeText(`${base}${path}`);
    toast.success(t('copyWebhookUrl'));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-12 text-muted-foreground">
        {t('loading')}
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push('/channels')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('detail.back')}
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{channel.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? t('active') : t('inactive')}
            </Badge>
            <span className="font-mono">{t('type.' + channel.type)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
            <Copy className="h-4 w-4 mr-1" />
            {t('copyWebhookUrl')}
          </Button>
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" />{t('detail.delete')}</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('detail.confirmDelete')}</DialogTitle>
                <DialogDescription>{t('detail.confirmDeleteDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => {}}>
                  {t('form.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {t('detail.delete')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.edit')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('form.nameLabel')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t('form.typeLabel')}</Label>
            <Select
              value={chanType}
              onValueChange={(val: string | null) => {
                if (val === 'whatsapp' || val === 'telegram' || val === 'facebook' || val === 'instagram' || val === 'web') {
                  setChanType(val);
                  setFieldValues({});
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {t('type.' + ct)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('form.configLabel')}</Label>
            <div className="rounded-lg border p-4 bg-muted/30">
              <ChannelFormFields
                channelType={chanType}
                config={fieldValues}
                onChange={handleFieldChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('form.configNote')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked: boolean) => setIsActive(checked)}
            />
            <Label htmlFor="isActive">{t('form.isActiveLabel')}</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('form.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
