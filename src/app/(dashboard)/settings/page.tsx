'use client';

import { useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { SettingsRail } from '@/components/settings/settings-rail';
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExternalLink, Image as LucideImage, MessageSquare } from 'lucide-react'

const SettingsOverview = dynamic(() => import('@/components/settings/settings-overview').then(m => m.SettingsOverview), { ssr: false })
const ProfileForm = dynamic(() => import('@/components/settings/profile-form').then(m => m.ProfileForm), { ssr: false })
const SecurityPanel = dynamic(() => import('@/components/settings/security-panel').then(m => m.SecurityPanel), { ssr: false })
const WidgetSettings = dynamic(() => import('@/components/settings/widget-settings').then(m => m.WidgetSettings), { ssr: false })
const IntegrationsPanel = dynamic(() => import('@/components/settings/integrations-panel').then(m => m.IntegrationsPanel), { ssr: false })
const AuditLog = dynamic(() => import('@/components/settings/audit-settings').then(m => m.AuditLog), { ssr: false })
const TimezoneSettings = dynamic(() => import('@/components/settings/timezone-settings').then(m => m.TimezoneSettings), { ssr: false })
const AppearancePanel = dynamic(() => import('@/components/settings/appearance-panel').then(m => m.AppearancePanel), { ssr: false })
const TelegramConfig = dynamic(() => import('@/components/settings/telegram-config').then(m => m.TelegramConfig), { ssr: false })
const WhatsAppConfig = dynamic(() => import('@/components/settings/whatsapp-config').then(m => m.WhatsAppConfig), { ssr: false })
const FacebookConfig = dynamic(() => import('@/components/settings/facebook-config').then(m => m.FacebookConfig), { ssr: false })
const InstagramConfig = dynamic(() => import('@/components/settings/instagram-config').then(m => m.InstagramConfig), { ssr: false })
const YouTubeConfig = dynamic(() => import('@/components/settings/youtube-config').then(m => m.YouTubeConfig), { ssr: false })
const TikTokConfig = dynamic(() => import('@/components/settings/tiktok-config').then(m => m.TikTokConfig), { ssr: false })
const SyncPanel = dynamic(() => import('@/components/settings/sync-panel').then(m => m.SyncPanel), { ssr: false })
const TemplateManager = dynamic(() => import('@/components/settings/template-manager').then(m => m.TemplateManager), { ssr: false })
const QuickRepliesManager = dynamic(() => import('@/components/settings/quick-replies-manager').then(m => m.QuickRepliesManager), { ssr: false })
const FieldsAndTagsPanel = dynamic(() => import('@/components/settings/fields-and-tags-panel').then(m => m.FieldsAndTagsPanel), { ssr: false })
const DealsSettings = dynamic(() => import('@/components/settings/deals-settings').then(m => m.DealsSettings), { ssr: false })
const MembersTab = dynamic(() => import('@/components/settings/members-tab').then(m => m.MembersTab), { ssr: false })
const ApiKeysSettings = dynamic(() => import('@/components/settings/api-keys-settings').then(m => m.ApiKeysSettings), { ssr: false })
const PaymentSettings = dynamic(() => import('@/components/settings/payment-settings').then(m => m.PaymentSettings), { ssr: false })
const AiKnowledgeCard = dynamic(() => import('@/components/settings/ai-knowledge').then(m => m.AiKnowledgeCard), { ssr: false })
import {
  resolveSection,
  type SettingsSection,
} from '@/components/settings/settings-sections';

function FacebookRedirect() {
  const t = useTranslations('Settings');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-primary" /> Facebook Messenger</CardTitle>
        <CardDescription>Conecta tu pagina de Facebook para recibir y enviar mensajes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Usa la API de canales para configurar Facebook. Necesitas un Page Access Token y Page ID de Facebook Developers.</p>
        <Button variant="outline" disabled>
          <ExternalLink className="h-4 w-4 mr-1" /> Configurar en Facebook Developers
        </Button>
      </CardContent>
    </Card>
  );
}

function InstagramRedirect() {
  const t = useTranslations('Settings');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><LucideImage className="h-4 w-4 text-primary" /> Instagram</CardTitle>
        <CardDescription>Conecta tu cuenta de Instagram para recibir y enviar mensajes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Usa la API de canales para configurar Instagram. Necesitas una cuenta profesional de Instagram vinculada a Facebook.</p>
        <Button variant="outline" disabled>
          <ExternalLink className="h-4 w-4 mr-1" /> Configurar en Meta Business
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { defaultCurrency, accountId, canEditSettings } = useAuth();
  const { mode } = useTheme();
  const t = useTranslations('Settings');

  // The URL (`?tab=`) is the single source of truth for the active
  // section — deep-linkable, and it keeps the existing links in the
  // app sidebar/header working. Legacy tab values (tags, custom-fields)
  // resolve onto their new home; unknown/empty → the Overview landing.
  const section = resolveSection(searchParams.get('tab'));

  const go = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  // Cheap, fetch-free rail hints. The Overview landing carries the
  // full live status/counts; the rail just surfaces the two that are
  // already in context.
  const hints: Partial<Record<SettingsSection, ReactNode>> = useMemo(
    () => ({
      appearance: mode.charAt(0).toUpperCase() + mode.slice(1),
      deals: defaultCurrency,
    }),
    [mode, defaultCurrency],
  );

  const panel: Record<SettingsSection, ReactNode> = useMemo(
    () => ({
      overview: <SettingsOverview onSelect={go} />,
      profile: <ProfileForm />,
    timezone: <TimezoneSettings />,
      security: <SecurityPanel />,
      appearance: <AppearancePanel />,
      widget: <WidgetSettings />,
      audit: <AuditLog />,
    integrations: <IntegrationsPanel />,
      whatsapp: <WhatsAppConfig />,
      telegram: <TelegramConfig />,
    facebook: <FacebookConfig />,
    instagram: <InstagramConfig />,
      templates: <TemplateManager />,
      'quick-replies': <QuickRepliesManager />,
      fields: <FieldsAndTagsPanel />,
      deals: <DealsSettings />,
      members: <MembersTab />,
      api: <ApiKeysSettings />,
      payments: <PaymentSettings />,
      'ai-knowledge': <AiKnowledgeCard accountId={accountId} canEdit={canEditSettings} hasEmbeddingsKey={false} />,
      youtube: <YouTubeConfig />,
      tiktok: <TikTokConfig />,
      sync: <SyncPanel />,
    }),
    [go],
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('pageTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('pageDesc')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
        <SettingsRail active={section} onSelect={go} hints={hints} />
        <div className="min-w-0">{panel[section]}</div>
      </div>
    </div>
  );
}
