import type { ChannelType } from '@/types'

export type TemplateSource = 'system';
export type TemplateClonePolicy = 'snapshot';

export interface TemplateMetadata {
  slug: string;
  version: string;
  schema_version: number;
  category: string;
  tags: string[];
  channel_types: ChannelType[];
  source: TemplateSource;
  clone_policy: TemplateClonePolicy;
}

export type WithTemplateMetadata<T extends { slug: string }> = T &
  TemplateMetadata;

export const SYSTEM_SNAPSHOT_TEMPLATE = {
  source: 'system',
  clone_policy: 'snapshot',
} as const;
