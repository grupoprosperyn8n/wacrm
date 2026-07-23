import { describe, expect, it } from 'vitest';

import { sanitizeTemplateCloneConfig } from './sanitize-clone';

describe('sanitizeTemplateCloneConfig', () => {
  it('removes root account/runtime identifiers while preserving safe flow edges', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      id: 'node-row-id',
      user_id: 'user-id',
      account_id: 'account-id',
      flow_id: 'flow-id',
      node_key: 'ask_name',
      next_node_key: 'handoff',
      true_next: 'yes_branch',
      tag_id: 'tag-id',
      custom_field_id: 'field-id',
    });

    expect(sanitized).toEqual({
      node_key: 'ask_name',
      next_node_key: 'handoff',
      true_next: 'yes_branch',
      tag_id: '',
      custom_field_id: '',
    });
  });

  it('preserves WhatsApp button reply ids in interactive template-shaped configs', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      kind: 'buttons',
      body: 'What do you need?',
      buttons: [
        { id: 'services', title: 'Services' },
        { id: 'pricing', title: 'Pricing' },
      ],
    });

    expect(sanitized).toEqual({
      kind: 'buttons',
      body: 'What do you need?',
      buttons: [
        { id: 'services', title: 'Services' },
        { id: 'pricing', title: 'Pricing' },
      ],
    });
  });

  it('preserves WhatsApp list row reply ids in interactive template-shaped configs', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      kind: 'list',
      button_label: 'View options',
      body: 'Pick a category:',
      sections: [
        {
          title: 'Services',
          rows: [
            {
              id: 'products',
              title: 'Products',
              description: 'Full catalog',
            },
            {
              id: 'quote',
              title: 'Quote',
              description: 'Request pricing',
            },
          ],
        },
      ],
    });

    expect(sanitized).toEqual({
      kind: 'list',
      button_label: 'View options',
      body: 'Pick a category:',
      sections: [
        {
          title: 'Services',
          rows: [
            {
              id: 'products',
              title: 'Products',
              description: 'Full catalog',
            },
            {
              id: 'quote',
              title: 'Quote',
              description: 'Request pricing',
            },
          ],
        },
      ],
    });
  });

  it('drops sensitive headers and token-like fields from HTTP configs', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      url: 'https://example.test/webhook',
      headers: {
        Authorization: 'Bearer secret',
        'X-API-Key': 'secret',
        'X-Safe': 'ok',
      },
      access_token: 'secret',
      body_template: '{"ok":true}',
    });

    expect(sanitized).toEqual({
      url: 'https://example.test/webhook',
      headers: { 'X-Safe': 'ok' },
      access_token: '',
      body_template: '{"ok":true}',
    });
  });

  it('normalizes camelCase sensitive keys without treating safe underscored names as secrets', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      clientSecret: 'secret',
      authToken: 'secret',
      bearerToken: 'secret',
      passwordHash: 'secret',
      apiKey: 'secret',
      accessToken: 'secret',
      refreshToken: 'secret',
      authorization: 'Bearer secret',
      response_var: 'reply',
      template_name: 'Welcome',
    });

    expect(sanitized).toEqual({
      clientSecret: '',
      authToken: '',
      bearerToken: '',
      passwordHash: '',
      apiKey: '',
      accessToken: '',
      refreshToken: '',
      authorization: '',
      response_var: 'reply',
      template_name: 'Welcome',
    });
  });

  it('normalizes account custom-field references to a safe built-in placeholder', () => {
    const sanitized = sanitizeTemplateCloneConfig({
      field: 'custom:field-id',
      value: '{{message.text}}',
      pipeline_id: 'pipeline-id',
      stage_id: 'stage-id',
      agent_id: 'agent-id',
    });

    expect(sanitized).toEqual({
      field: 'name',
      value: '{{message.text}}',
      pipeline_id: '',
      stage_id: '',
      agent_id: '',
    });
  });
});
