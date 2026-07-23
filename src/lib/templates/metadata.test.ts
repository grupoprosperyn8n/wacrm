import { describe, expect, it } from 'vitest';

import { listFlowTemplates } from '@/lib/flows/templates';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/templates';

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
    }
  });
});
