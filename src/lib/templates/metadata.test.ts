import { describe, expect, it } from 'vitest';

import { listFlowTemplates } from '@/lib/flows/templates';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/templates';
import { ALL_CHANNEL_TYPES, isChannelType } from '@/lib/channels/channel-scope';

describe('system template metadata', () => {
  it('versions every Flow Beta template as a system snapshot', () => {
    expect(listFlowTemplates()).not.toHaveLength(0);
    for (const template of listFlowTemplates()) {
      expect(template).toMatchObject({
        slug: expect.any(String),
        version: expect.any(String),
        schema_version: expect.any(Number),
        category: expect.any(String),
        source: 'system',
        clone_policy: 'snapshot',
      });
      expect(template.tags.length).toBeGreaterThan(0);
      expect(template.channel_types.length).toBeGreaterThan(0);
      expect(template.channel_types.every(isChannelType)).toBe(true);
    }
  });

  it('versions every legacy Automation template as a system snapshot', () => {
    const templates = Object.values(AUTOMATION_TEMPLATES);
    expect(templates).not.toHaveLength(0);
    for (const template of templates) {
      expect(template).toMatchObject({
        slug: expect.any(String),
        version: expect.any(String),
        schema_version: expect.any(Number),
        category: expect.any(String),
        source: 'system',
        clone_policy: 'snapshot',
      });
      expect(template.tags.length).toBeGreaterThan(0);
      expect(template.channel_types.length).toBeGreaterThan(0);
      expect(template.channel_types.every(isChannelType)).toBe(true);
    }
  });

  it('keeps provider-specific scopes and general templates multi-channel', () => {
    expect(AUTOMATION_TEMPLATES.instagram_dm.channel_types).toEqual(['instagram']);
    expect(AUTOMATION_TEMPLATES.facebook.channel_types).toEqual(['facebook']);
    expect(AUTOMATION_TEMPLATES.web_chat.channel_types).toEqual(['web']);
    expect(AUTOMATION_TEMPLATES.telegram.channel_types).toEqual(['telegram']);
    expect(AUTOMATION_TEMPLATES.support_faq.channel_types).toEqual([...ALL_CHANNEL_TYPES]);
    expect(AUTOMATION_TEMPLATES.lead_capture.channel_types).toEqual([...ALL_CHANNEL_TYPES]);
  });
});
