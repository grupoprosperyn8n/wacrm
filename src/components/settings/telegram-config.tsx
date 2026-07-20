'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';

interface BotInfo {
  id: number;
  username: string;
  first_name: string;
}

export function TelegramConfig() {
  const t = useTranslations('Settings.telegram');
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [channelName, setChannelName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [statusMessage, setStatusMessage] = useState('');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [isNewConfig, setIsNewConfig] = useState(true);

  const loadedAccountIdRef = useRef<string | null>(null);

  const webhookUrl =
    channelId && typeof window !== 'undefined'
      ? `${window.location.origin}/api/receive/telegram/${channelId}`
      : '';

  async function fetchConfig(acctId: string) {
    setLoading(true);
    try {
      // Check if this account already has a Telegram channel
      const { data: channel, error } = await supabase
        .from('channels')
        .select('id, name, config, is_active')
        .eq('type', 'telegram')
        .eq('account_id', acctId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load Telegram channel:', error);
      }

      if (channel) {
        setIsNewConfig(false);
        setChannelId(channel.id);
        setChannelName(channel.name || '');
        const cfg = channel.config as Record<string, unknown>;
        // Show masked token if one exists
        if (cfg?.bot_token) {
          setBotToken('••••••••••••••••');
        }

        // Health check via API
        try {
          const res = await fetch('/api/telegram/config', { method: 'GET' });
          const payload = await res.json();
          if (payload.connected) {
            setConnectionStatus('connected');
            setBotInfo(payload.bot);
            setStatusMessage('');
            setChannelId(payload.channel_id);
          } else {
            setConnectionStatus('disconnected');
            setStatusMessage(payload.message || '');
            setBotInfo(null);
          }
        } catch {
          setConnectionStatus('disconnected');
          setStatusMessage('Health check failed');
        }
      } else {
        setIsNewConfig(true);
        setChannelId(null);
        setChannelName('');
        setBotToken('');
        setConnectionStatus('disconnected');
        setBotInfo(null);
        setStatusMessage('');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      loadedAccountIdRef.current = null;
      setLoading(false);
      return;
    }
    if (loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    fetchConfig(accountId);
  }, [authLoading, profileLoading, user?.id, accountId]);

  async function handleSave() {
    if (!botToken.trim() || botToken === '••••••••••••••••') {
      toast.error('Bot token is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: botToken.trim(),
          name: channelName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration');
        setSaving(false);
        return;
      }

      setWebhookConfigured(data.webhook_configured);
      setChannelId(data.channel_id);
      setBotInfo(data.bot);
      setConnectionStatus('connected');
      setStatusMessage('');
      setIsNewConfig(false);

      toast.success(
        data.webhook_configured
          ? `Connected to @${data.bot?.username || 'Telegram Bot'}`
          : 'Bot token saved but webhook may need manual setup',
      );

      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    try {
      setTesting(true);
      const res = await fetch('/api/telegram/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setBotInfo(payload.bot);
        setStatusMessage('');
        toast.success(
          payload.bot
            ? `Connected to @${payload.bot.username}`
            : 'Connection OK',
        );
      } else {
        setConnectionStatus('disconnected');
        setStatusMessage(payload.message || 'API connection failed');
        toast.error(payload.message || 'Connection failed');
      }
    } catch (err) {
      console.error('Test error:', err);
      setConnectionStatus('disconnected');
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  function handleCopyWebhook() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    toast.success(t('webhookCopied'));
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead title={t('title')} description={t('description')} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Connection status */}
          <Alert className="bg-card border-border">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <AlertTitle className="text-foreground mb-0">
                {connectionStatus === 'connected' ? t('connected') : t('notConnected')}
              </AlertTitle>
            </div>
            <AlertDescription className="text-muted-foreground">
              {connectionStatus === 'connected'
                ? botInfo
                  ? t('connectedDesc', { username: `@${botInfo.username}` })
                  : t('connectedDescGeneric')
                : statusMessage || t('notConnectedDesc')}
            </AlertDescription>
          </Alert>

          {/* Bot Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('botCredentials')}</CardTitle>
              <CardDescription className="text-muted-foreground">{t('botCredentialsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('botToken')}</Label>
                <Input
                  placeholder={t('botTokenPlaceholder')}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                  type="password"
                />
                {!isNewConfig && (
                  <p className="text-xs text-muted-foreground">{t('tokenHint')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('channelName')}</Label>
                <Input
                  placeholder={t('channelNamePlaceholder')}
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {saving ? t('saving') : isNewConfig ? t('saveConfig') : t('saveConfig')}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {t('testConnection')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook URL */}
          {channelId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">{t('webhookTitle')}</CardTitle>
                <CardDescription className="text-muted-foreground">{t('webhookDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t('webhookUrl')}</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono text-foreground break-all">
                      {webhookUrl}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
                <Alert
                  className={
                    webhookConfigured
                      ? 'bg-emerald-950/30 border-emerald-700/50'
                      : 'bg-amber-950/30 border-amber-700/50'
                  }
                >
                  <div className="flex items-center gap-2">
                    {webhookConfigured ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <XCircle className="size-4 text-amber-400" />
                    )}
                    <AlertTitle className="text-sm mb-0">
                      {webhookConfigured ? t('webhookSet') : t('webhookNotSet')}
                    </AlertTitle>
                  </div>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Setup instructions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('setupInstructions')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('setupInstructionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion defaultValue={["step1"]}>
                <AccordionItem value="step1">
                  <AccordionTrigger className="text-sm">{t('step1')}</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('step1_1')}</p>
                    <p>{t('step1_2')}</p>
                    <p>{t('step1_3')}</p>
                    <p>{t('step1_4')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-2"
                      onClick={() => window.open('https://t.me/BotFather', '_blank')}
                    >
                      <ExternalLink className="size-3" />
                      {t('openBotFather')}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step2">
                  <AccordionTrigger className="text-sm">{t('step2')}</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('step2_1')}</p>
                    <p>{t('step2_2')}</p>
                    <p>{t('step2_3')}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step3">
                  <AccordionTrigger className="text-sm">{t('step3')}</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('step3_1')}</p>
                    <p>{t('step3_2')}</p>
                    <p>{t('step3_3')}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step4">
                  <AccordionTrigger className="text-sm">{t('step4')}</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('step4_1')}</p>
                    <p>{t('step4_2')}</p>
                    {webhookUrl && (
                      <div className="rounded bg-muted p-2 mb-2">
                        <code className="text-xs break-all">{webhookUrl}</code>
                      </div>
                    )}
                    <p>{t('step4_3')}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-xs gap-1"
                onClick={() => window.open('https://core.telegram.org/bots/api', '_blank')}
              >
                <ExternalLink className="size-3" />
                {t('apiDocs')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
