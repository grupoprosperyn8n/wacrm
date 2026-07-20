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
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ChannelFormFields } from '@/components/channels/channel-form-fields';
import type { ChannelType } from '@/types';

const CHANNEL_TYPES: ChannelType[] = ['whatsapp', 'telegram', 'facebook', 'instagram', 'web'];
const ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  facebook: '👍',
  instagram: '📸',
  web: '🌐',
};

export default function NewChannelPage() {
  const t = useTranslations('Channels');
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('telegram');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    // Build the JSON config from type-specific fields
    const parsedConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value.trim()) {
        parsedConfig[key] = value.trim();
      }
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
          <CardContent className="space-y-6">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('form.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('form.namePlaceholder')}
                required
              />
            </div>

            {/* Channel Type */}
            <div className="space-y-2">
              <Label htmlFor="type">{t('form.typeLabel')}</Label>
              <Select
                value={type}
                onValueChange={(val: string | null) => {
                  setType((val ?? 'telegram') as ChannelType);
                  setFieldValues({}); // Reset fields when type changes
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ICONS[ct] ?? ''} {t('type.' + ct)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type-specific configuration fields */}
            <div className="space-y-2">
              <Label>{t('form.configLabel')}</Label>
              <div className="rounded-lg border p-4 bg-muted/30">
                <ChannelFormFields
                  channelType={type}
                  config={fieldValues}
                  onChange={handleFieldChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('form.configNote')}
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked: boolean) => setIsActive(checked)}
              />
              <Label htmlFor="isActive">{t('form.isActiveLabel')}</Label>
            </div>

            {/* Buttons */}
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
