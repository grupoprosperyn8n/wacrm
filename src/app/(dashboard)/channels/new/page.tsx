'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewChannelPage() {
  const t = useTranslations('Channels');
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [type, setType] = useState('telegram');
  const [config, setConfig] = useState('{}');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = JSON.parse(config);
    } catch {
      toast.error(t('form.toastError'));
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('channels').insert({
      name: name.trim(),
      type,
      config: parsedConfig,
      is_active: isActive,
    });

    setSaving(false);
    if (error) {
      toast.error(t('form.toastError') + ': ' + error.message);
      return;
    }

    toast.success(t('form.toastCreated'));
    router.push('/channels');
    router.refresh();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push('/channels')} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('detail.back')}
      </Button>
      <h1 className="text-2xl font-bold">{t('addChannel')}</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('addChannel')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('form.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Telegram Bot"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('form.typeLabel')}</Label>
              <Select value={type} onValueChange={(val: string | null) => setType(val ?? 'telegram')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['whatsapp', 'telegram', 'facebook', 'instagram', 'web'] as const).map(
                    (ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct.charAt(0).toUpperCase() + ct.slice(1)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">{t('form.configLabel')}</Label>
              <Textarea
                id="config"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder={`{\n  "bot_token": "..."\n}`}
              />
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
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('addChannel')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/channels')}>
                {t('form.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}