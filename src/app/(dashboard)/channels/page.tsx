'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Channel } from '@/types';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { GatedButton } from '@/components/ui/gated-button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  facebook: '👍',
  instagram: '📸',
  web: '🌐',
};

export default function ChannelsListPage() {
  const t = useTranslations('Channels');
  const router = useRouter();
  const supabase = createClient();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load channels', error);
      } else {
        setChannels((data ?? []) as Channel[]);
      }
      setLoading(false);
    };
    load();
  }, [supabase, refreshKey]);

  const copyWebhookUrl = (ch: Channel) => {
    const base = window.location.origin;
    const path = ch.type === 'web' ? '/api/receive/webchat' : `/api/receive/${ch.type}/${ch.id}`;
    navigator.clipboard.writeText(`${base}${path}`);
    toast.success(t('copyWebhookUrl'));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('addChannel')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <GatedButton
            canAct={true}
            gateReason="create channels"
            onClick={() => router.push('/channels/new')}
          >
            <Plus className="h-4 w-4" />
            {t('addChannel')}
          </GatedButton>
          <Button variant="ghost" size="icon" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addChannel')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('loading')}</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('empty')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch) => (
                  <TableRow
                    key={ch.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/channels/${ch.id}`)}
                  >
                    <TableCell className="font-medium">{ch.name}</TableCell>
                    <TableCell className="font-mono text-sm">{TYPE_ICONS[ch.type] ?? ''} {t('type.' + ch.type)}</TableCell>
                    <TableCell>
                      <Badge variant={ch.is_active ? 'default' : 'secondary'}>
                        {ch.is_active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(ch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyWebhookUrl(ch);
                        }}
                        title={t('copyWebhookUrl')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}