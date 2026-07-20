'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChannelType } from '@/types';

interface ChannelFormFieldsProps {
  channelType: ChannelType;
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const TYPE_FIELDS: Record<ChannelType, Array<{ key: string; labelKey: string; placeholderKey: string; secret?: boolean }>> = {
  telegram: [
    { key: 'bot_token', labelKey: 'telegram.botToken', placeholderKey: 'telegram.botTokenPlaceholder', secret: true },
  ],
  whatsapp: [
    { key: 'phone_number_id', labelKey: 'whatsapp.phoneNumberId', placeholderKey: 'whatsapp.phoneNumberIdPlaceholder' },
    { key: 'access_token', labelKey: 'whatsapp.accessToken', placeholderKey: 'whatsapp.accessTokenPlaceholder', secret: true },
  ],
  facebook: [
    { key: 'page_id', labelKey: 'facebook.pageId', placeholderKey: 'facebook.pageIdPlaceholder' },
    { key: 'access_token', labelKey: 'facebook.accessToken', placeholderKey: 'facebook.accessTokenPlaceholder', secret: true },
    { key: 'app_secret', labelKey: 'facebook.appSecret', placeholderKey: 'facebook.appSecretPlaceholder', secret: true },
    { key: 'verify_token', labelKey: 'facebook.verifyToken', placeholderKey: 'facebook.verifyTokenPlaceholder', secret: true },
  ],
  instagram: [
    { key: 'business_account_id', labelKey: 'instagram.businessAccountId', placeholderKey: 'instagram.businessAccountIdPlaceholder' },
    { key: 'access_token', labelKey: 'instagram.accessToken', placeholderKey: 'instagram.accessTokenPlaceholder', secret: true },
  ],
  web: [
    { key: 'title', labelKey: 'web.title', placeholderKey: 'web.titlePlaceholder' },
    { key: 'welcome_message', labelKey: 'web.welcomeMessage', placeholderKey: 'web.welcomeMessagePlaceholder' },
    { key: 'brand_color', labelKey: 'web.brandColor', placeholderKey: 'web.brandColorPlaceholder' },
  ],
};

export function ChannelFormFields({ channelType, config, onChange }: ChannelFormFieldsProps) {
  const t = useTranslations('Channels');
  const fields = TYPE_FIELDS[channelType] ?? [];

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`field-${field.key}`}>
            {t(field.labelKey)}
          </Label>
          <Input
            id={`field-${field.key}`}
            type={field.secret ? 'password' : 'text'}
            value={config[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={t(field.placeholderKey)}
            className={field.secret ? 'font-mono text-sm' : ''}
          />
        </div>
      ))}
    </div>
  );
}
