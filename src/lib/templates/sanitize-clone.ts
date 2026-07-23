const STRIP_KEYS = new Set([
  'user_id',
  'account_id',
  'flow_id',
  'automation_id',
  'parent_step_id',
]);

const EMPTY_STRING_KEYS = new Set([
  'tag_id',
  'agent_id',
  'pipeline_id',
  'stage_id',
  'custom_field_id',
]);

const SENSITIVE_KEY_PHRASES = new Set([
  'api_key',
  'access_token',
  'refresh_token',
  'auth_token',
  'bearer_token',
  'client_secret',
  'password_hash',
  'authorization',
]);
const SENSITIVE_HEADER_NAMES =
  /^(authorization|proxy-authorization|x-api-key|api-key|apikey|x-auth-token|x-access-token|cookie|set-cookie)$/i;

export function sanitizeTemplateCloneConfig<T>(config: T): T {
  return sanitizeValue(config, undefined, 0) as T;
}

export function sanitizeTemplateCloneConfigs<T>(configs: T[]): T[] {
  return configs.map((config) => sanitizeTemplateCloneConfig(config));
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  depth: number
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, undefined, depth + 1));
  }

  if (!value || typeof value !== 'object') {
    if (
      key === 'field' &&
      typeof value === 'string' &&
      value.startsWith('custom:')
    ) {
      return 'name';
    }
    if (key && isSensitiveKey(key)) return '';
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(input)) {
    if (STRIP_KEYS.has(entryKey) || (depth === 0 && entryKey === 'id'))
      continue;
    if (EMPTY_STRING_KEYS.has(entryKey)) {
      output[entryKey] = '';
      continue;
    }
    if (
      entryKey === 'field' &&
      typeof entryValue === 'string' &&
      entryValue.startsWith('custom:')
    ) {
      output[entryKey] = 'name';
      continue;
    }
    if (isSensitiveKey(entryKey)) {
      output[entryKey] = '';
      continue;
    }
    if (entryKey === 'headers') {
      output[entryKey] = sanitizeHeadersValue(entryValue);
      continue;
    }
    output[entryKey] = sanitizeValue(entryValue, entryKey, depth + 1);
  }
  return output;
}

function sanitizeHeadersValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((header) => {
        if (!header || typeof header !== 'object') return header;
        const row = header as Record<string, unknown>;
        const name = String(row.key ?? row.name ?? '').trim();
        if (SENSITIVE_HEADER_NAMES.test(name)) return null;
        return sanitizeValue(row, undefined, 0);
      })
      .filter(Boolean);
  }
  if (value && typeof value === 'object')
    return sanitizeHeaders(value as Record<string, unknown>);
  return value;
}

function sanitizeHeaders(
  headers: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.test(name.trim())) continue;
    output[name] = isSensitiveKey(name) ? '' : sanitizeValue(value, name, 0);
  }
  return output;
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (SENSITIVE_KEY_PHRASES.has(normalized)) return true;

  const parts = normalized.split('_').filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.includes('authorization')) return true;
  if (parts.includes('credential')) return true;
  if (parts.includes('password')) return true;
  if (parts.includes('secret')) return true;
  if (parts.includes('token')) return true;

  return false;
}

function normalizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}
