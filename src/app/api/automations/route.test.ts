import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({ body, init }),
  },
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(),
  toErrorResponse: vi.fn(),
}));
vi.mock('@/lib/automations/admin-client', () => ({ supabaseAdmin: vi.fn() }));
vi.mock('@/lib/automations/templates', () => ({ getTemplate: vi.fn() }));
vi.mock('@/lib/templates/sanitize-clone', () => ({
  sanitizeTemplateCloneConfig: vi.fn((config) => ({
    ...config,
    sanitized: true,
  })),
}));
vi.mock('@/lib/automations/steps-tree', () => ({ insertSteps: vi.fn() }));
vi.mock('@/lib/automations/validate', () => ({
  validateStepsForActivation: vi.fn(() => []),
  validateTriggerForActivation: vi.fn(() => []),
}));

import { requireRole } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { getTemplate } from '@/lib/automations/templates';
import { insertSteps } from '@/lib/automations/steps-tree';
import { createClient } from '@/lib/supabase/server';
import { sanitizeTemplateCloneConfig } from '@/lib/templates/sanitize-clone';
import { buildAutomationInsert, POST } from './route';

const templateDefinition = {
  slug: 'facebook',
  version: '1.0.0',
  schema_version: 1,
  name: 'Facebook',
  description: 'Facebook template',
  trigger_type: 'keyword_match',
  trigger_config: { keywords: ['facebook'] },
  steps: [
    {
      step_type: 'add_tag',
      step_config: { tag_id: 'seed-tag-id', apiKey: 'secret' },
    },
  ],
};

describe('buildAutomationInsert', () => {
  it('omits source_template keys when no trusted template definition exists', () => {
    const insert = buildAutomationInsert({
      userId: 'user-1',
      accountId: 'account-1',
      name: 'Blank automation',
      triggerType: 'new_message_received',
      triggerConfig: {},
      isActive: false,
      templateDefinition: null,
    });

    expect(insert).toEqual({
      user_id: 'user-1',
      account_id: 'account-1',
      name: 'Blank automation',
      description: null,
      trigger_type: 'new_message_received',
      trigger_config: {},
      is_active: false,
    });
    expect(insert).not.toHaveProperty('source_template_slug');
    expect(insert).not.toHaveProperty('source_template_version');
    expect(insert).not.toHaveProperty('source_template_schema_version');
  });

  it('adds source_template keys only for a known template definition', () => {
    const insert = buildAutomationInsert({
      userId: 'user-1',
      accountId: 'account-1',
      name: 'Template clone',
      triggerType: 'keyword_match',
      templateDefinition: {
        slug: 'facebook',
        version: '1.0.0',
        schema_version: 1,
      },
    });

    expect(insert).toMatchObject({
      source_template_slug: 'facebook',
      source_template_version: '1.0.0',
      source_template_schema_version: 1,
    });
  });
});

describe('POST automation template insert behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue({} as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: { account_id: 'account-1' } }),
          })),
        })),
      })),
    } as never);
    vi.mocked(supabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'automation-1' },
              error: null,
            }),
          })),
        })),
      })),
    } as never);
    vi.mocked(insertSteps).mockResolvedValue(null);
  });

  it('preserves client-edited step configs when a template slug is present with steps', async () => {
    vi.mocked(getTemplate).mockReturnValue(templateDefinition as never);
    const editedSteps = [
      {
        step_type: 'add_tag',
        step_config: {
          tag_id: 'user-selected-tag-id',
          agent_id: 'user-selected-agent-id',
        },
      },
    ];

    await POST(
      new Request('https://wacrm.test/api/automations', {
        method: 'POST',
        body: JSON.stringify({
          template: 'facebook',
          name: 'Edited clone',
          trigger_type: 'keyword_match',
          steps: editedSteps,
        }),
      })
    );

    expect(sanitizeTemplateCloneConfig).not.toHaveBeenCalled();
    expect(insertSteps).toHaveBeenCalledWith('automation-1', editedSteps);
  });

  it('sanitizes only server-owned template seed steps when no steps are provided', async () => {
    vi.mocked(getTemplate).mockReturnValue(templateDefinition as never);

    await POST(
      new Request('https://wacrm.test/api/automations', {
        method: 'POST',
        body: JSON.stringify({ template: 'facebook' }),
      })
    );

    expect(sanitizeTemplateCloneConfig).toHaveBeenCalledWith({
      tag_id: 'seed-tag-id',
      apiKey: 'secret',
    });
    expect(insertSteps).toHaveBeenCalledWith('automation-1', [
      {
        step_type: 'add_tag',
        step_config: {
          tag_id: 'seed-tag-id',
          apiKey: 'secret',
          sanitized: true,
        },
        branches: undefined,
      },
    ]);
  });
});
