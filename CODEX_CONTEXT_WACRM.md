# CONTEXTO COMPLETO — WACRM (WhatsApp Automation CRM)

> Documento maestro para que Codex en AionUI entienda TODO el proyecto y continúe el desarrollo sin perder contexto.
> Versión: Julio 2026 — Proyecto en producción activa.

---

## 1. DATOS GENERALES

| Campo | Valor |
|-------|-------|
| **Nombre** | wacrm (WhatsApp Automation CRM) |
| **Propósito** | CRM multicanal con automatizaciones vía flujos visuales. WhatsApp, Telegram, Facebook, Instagram, web chat. |
| **Repo** | `https://github.com/grupoprosperyn8n/wacrm.git` (rama `main`) |
| **Stack** | Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + Realtime) |
| **Idioma** | Español (i18n con next-intl, locale `es` como default, inglés también soportado) |
| **URL producción** | `https://wacrm.sistemasagenticos.cloud` |
| **Estado actual** | EN PRODUCCIÓN — login funciona, dashboard carga, flujos (beta) funcionales |
| **Problema resuelto recientemente** | ANON_KEY corrupta en Coolify DB causaba `DecryptException` y 500 en POST /api/flows. Ahora las env vars correctas están en DB. |
| **Problema PENDIENTE** | El deploy actual puede tener ANON_KEY no sincronizada con Kong después del último rebuild fallido. Hay que verificar login post-deploy. |

---

## 2. ESTRUCTURA DEL PROYECTO

```
/home/diegol/Documentos/wacrm/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          ← Panel principal protegido (layout con sidebar)
│   │   │   ├── dashboard/        ← Página inicio con métricas por canal
│   │   │   ├── inbox/            ← Bandeja de entrada multicanal
│   │   │   ├── contacts/         ← Gestión de contactos
│   │   │   ├── deals/            ← Pipeline de ventas (kanban)
│   │   │   ├── flows/            ← Automatizaciones visuales (FLUJOS BETA)
│   │   │   ├── settings/         ← Configuración (perfil, proveedores, seguridad)
│   │   │   ├── automations/      ← Automatizaciones legacy
│   │   │   ├── campaigns/        ← Campañas de marketing
│   │   │   └── analytics/        ← Analíticas
│   │   ├── api/
│   │   │   ├── flows/            ← CRUD de flujos (POST/GET/PUT/DELETE)
│   │   │   ├── whatsapp/         ← Webhooks y API de WhatsApp Cloud
│   │   │   ├── telegram/         ← Webhooks y API de Telegram
│   │   │   ├── facebook/         ← Webhooks de Facebook Messenger
│   │   │   ├── instagram/        ← Webhooks de Instagram
│   │   │   ├── webchat/          ← Web chat embebido
│   │   │   ├── contacts/         ← CRUD contactos
│   │   │   ├── deals/            ← CRUD deals
│   │   │   ├── conversations/    ← CRUD conversaciones
│   │   │   └── messages/         ← Envío de mensajes
│   │   ├── login/                ← Página de inicio de sesión
│   │   ├── signup/               ← Página de registro
│   │   └── forgot-password/      ← Recuperación de contraseña
│   ├── components/
│   │   ├── ui/                   ← Componentes base (shadcn/ui)
│   │   ├── flows/                ← Flow builder visual (React Flow)
│   │   ├── settings/             ← Configuraciones de proveedores
│   │   ├── inbox/                ← Componentes de bandeja
│   │   └── dashboard/            ← Componentes del panel
│   ├── lib/
│   │   ├── messaging/providers/  ← Lógica de cada proveedor (whatsapp.ts, telegram.ts, facebook.ts...)
│   │   ├── flows/                ← Engine de flujos, types, execution
│   │   ├── automations/          ← Automatizaciones legacy
│   │   └── supabase/             ← Clientes Supabase (browser, server, admin)
│   ├── hooks/                    ← Custom hooks React
│   ├── i18n/                     ← Config de next-intl (request.ts)
│   └── middleware.ts             ← Protección de rutas, i18n routing
├── messages/
│   ├── es.json                   ← Traducciones español (completo)
│   └── en.json                   ← Traducciones inglés
├── supabase/
│   └── migrations/               ← Migraciones SQL numeradas
├── Dockerfile                    ← Para build pack Dockerfile (alternativa a nixpacks)
├── nixpacks.toml                 ← Para build pack Nixpacks (ACTUAL)
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. INFRAESTRUCTURA — VPS PRODUCCIÓN

| Campo | Valor |
|-------|-------|
| **VPS IP** | `187.127.45.42` |
| **Usuario SSH** | `root` |
| **Clave SSH** | `~/.ssh/id_hermes_coolify` |
| **Coolify Panel** | `https://coolify.sistemasagenticos.cloud` |
| **App UUID en Coolify** | `q301kisqnonwrolfk7co4al9` |
| **Build Pack** | `nixpacks` (NO Dockerfile actualmente) |
| **Hosting** | Coolify auto-hosted v4.x en el mismo VPS |
| **Proxy** | Traefik (Coolify lo gestiona automáticamente) |
| **Archivo .env en disco** | `/data/coolify/applications/q301kisqnonwrolfk7co4al9/.env` |
| **Carpeta local del código** | `/home/diegol/Documentos/wacrm/` |

### 3.1 Contenedores Supabase (tres instancias en el VPS)

| Instancia | Rol | Estado |
|-----------|-----|--------|
| `inmeoggzpvoud701ba0r61s7` | **LA DE WACRM** — tiene accounts, profiles, contacts, deals, flows | ✅ Activa |
| `sbgyqh7qyk2jpsxnk9gtuphy` | Proyecto Supabase anterior | Inactiva (0 usuarios) |
| `zl1hngo00mv8a8xfrld06ery` | Otra instancia, posiblemente de pruebas | Inactiva (0 usuarios, tablas del sistema sin datos) |

**Comando para verificar instancias:**
```bash
ssh -i ~/.ssh/id_hermes_coolify root@187.127.45.42 "docker ps --format '{{.Names}}' | grep supabase"
```

### 3.2 Variables de Entorno NEXT_PUBLIC_*

Estas se inlinean en BUILD TIME. No basta con cambiarlas en runtime.

| Variable | Valor | Nota |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://crmssag-supabase.sistemasagenticos.cloud` | URL del Kong de wacrm |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT de ~169 chars (debe coincidir con Kong) | Fuente de verdad: Kong container |
| `NEXT_PUBLIC_APP_LOCALE` | `es` | Forzar español |

**⚠️ PITFALL CRÍTICO — Carga diferida de createClient():**
En páginas `"use client"`, `createClient()` (createBrowserClient) debe llamarse DENTRO de event handlers (`handleLogin`, `handleSignup`, etc.), NUNCA en module scope ni component body scope. Si se llama en module scope, Next.js intenta prerenderizar con `undefined` y falla con "Your project's URL and API key are required".

Esto ya está corregido en login, signup y forgot-password. CUALQUIER página NUEVA debe seguir este patrón.

**⚠️ DUPLICADOS EN DB:** Coolify puede tener MÚLTIPLES filas con la misma key en `environment_variables`. Si se actualiza la fila equivocada (e.g. una fila encriptada), el deploy usa la fila corrupta restante. Hay que eliminar las corruptas y recrearlas via Tinker.

---

## 4. SUPABASE — SCHEMA PRINCIPAL

### 4.1 Tablas Core

**accounts** — Cuentas de organización (multi-tenant)
```sql
id UUID PK, owner_user_id UUID FK→auth.users, name TEXT, 
default_currency TEXT CHECK(uppercase), settings JSONB
```

**profiles** — Perfiles de usuario por cuenta
```sql
id UUID PK, user_id UUID FK→auth.users, full_name TEXT, 
email TEXT, role TEXT default 'user', account_id UUID FK→accounts, 
account_role account_role_enum (owner|admin|agent|viewer)
```

**contacts** — Contactos de CRM
```sql
id UUID PK, account_id UUID FK→accounts, name TEXT, 
phone TEXT, email TEXT, avatar_url TEXT, 
custom_fields JSONB, source TEXT, tags TEXT[], 
created_at, updated_at
```

**conversations** — Conversaciones por canal
```sql
id UUID PK, account_id UUID FK→accounts, contact_id UUID FK→contacts,
user_id UUID FK→auth.users, channel TEXT, status TEXT,
last_message_at TIMESTAMPTZ, unread_count INT DEFAULT 0,
metadata JSONB, created_at, updated_at
```

**messages** — Mensajes individuales
```sql
id UUID PK, conversation_id UUID FK→conversations,
sender_type TEXT CHECK(customer|agent|bot), sender_id UUID,
content_type TEXT CHECK(text|image|document|audio|video|location|template),
content_text TEXT, media_url TEXT, template_name TEXT,
message_id TEXT, status TEXT CHECK(sending|sent|delivered|read|failed), 
channel TEXT, ai_generated BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ DEFAULT now()
```
*Nota: `channel` se agregó para que el dashboard filtre sin JOIN. Hacer backfill si algún INSERT lo omite.*

**flows** — Automatizaciones visuales (sistema nuevo)
```sql
id UUID PK, user_id UUID FK→auth.users, account_id UUID FK→accounts,
name TEXT NOT NULL, description TEXT, status TEXT CHECK(active|inactive|error),
trigger_type TEXT NOT NULL, trigger_config JSONB NOT NULL,
entry_node_id TEXT, fallback_policy JSONB NOT NULL,
execution_count INT DEFAULT 0, last_executed_at TIMESTAMPTZ,
created_at, updated_at
-- RLS: flows_select usando is_account_member(account_id)
```

**ai_configs** — Configuración de agentes IA
```sql
id UUID PK, account_id UUID FK→accounts, provider TEXT,
api_key TEXT, model TEXT, enabled BOOLEAN, created_by UUID FK→auth.users
```

**whatsapp_config, telegram_config, facebook_config, instagram_config** — Config por proveedor
(Todas con: id UUID PK, user_id/account_id FK, tokens, status connected|disconnected, webhook URL)

### 4.2 Otras tablas

- **deals** (oportunidades de venta en pipeline)
- **pipelines / pipeline_stages** (configuración de pipeline kanban)
- **automations / automation_logs** (sistema legacy de automatizaciones)
- **campaigns / campaign_messages** (campañas de marketing)
- **notes** (notas en deals/contacts)
- **analytics_events** (eventos de analítica)
- **account_invitations** (invitaciones multi-usuario)

### 4.3 RLS (Row Level Security)

Todas las tablas usan RLS basado en `auth.uid()`. Patrón común:
```sql
-- Las tablas con account_id verifican membresía
CREATE POLICY "account access" ON table_name 
  FOR ALL USING (is_account_member(account_id));

-- Helper function
CREATE OR REPLACE FUNCTION is_account_member(target_id UUID, min_role account_role_enum DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND account_id = target_id 
    AND account_role >= min_role::text::account_role_enum
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 5. ENV VARS COMPLETAS (del .env.local.example)

```
NEXT_PUBLIC_SUPABASE_URL=https://crmssag-supabase.sistemasagenticos.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=[JWT de ~169 chars - obtener de Kong]
NEXT_PUBLIC_APP_LOCALE=es
NEXT_PUBLIC_APP_URL=https://wacrm.sistemasagenticos.cloud

# Server-side only (NO NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=[service_role_key de Supabase]
SUPABASE_JWT_SECRET=[JWT secret para verificar tokens]
SUPABASE_ANON_KEY=[mismo valor que NEXT_PUBLIC_SUPABASE_ANON_KEY]

# Configuración
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
```

**⚠️ FUENTE DE VERDAD:** La ANON_KEY correcta se obtiene desde el contenedor Kong:
```bash
docker exec supabase-kong-inmeoggzpvoud701ba0r61s7 env | grep ^ANON_KEY= | cut -d= -f2-
```
Longitud esperada: **169 chars** (JWT HS256 con `iss: "supabase"`, `iat`, `exp > 2050`, `role: "anon"`).

---

## 6. COOLIFY DB — TABLAS RELEVANTES

### 6.1 environment_variables

```sql
-- Esquema
id BIGSERIAL PK, key TEXT, value TEXT (encriptado con Laravel APP_KEY),
resourceable_type TEXT (App\Models\Application), resourceable_id TEXT,
is_buildtime BOOLEAN, is_runtime BOOLEAN, is_preview BOOLEAN,
is_literal BOOLEAN, is_multiline BOOLEAN, is_shown_once BOOLEAN,
is_shared BOOLEAN, comment TEXT, uuid UUID, version INT, 
order INT, created_at, updated_at
```

**⚠️ CRÍTICO:** El `value` se encripta con AES-256-CBC + APP_KEY de Laravel. NO se puede insertar texto plano. Usar Eloquent (`new EnvironmentVariable()`) que encripta automáticamente.

**⚠️ DUPLICADOS:** Por cada variable hay DOS filas (una con `is_literal=true` y otra con `is_literal=false`). Actualizar AMBAS.

**⚠️ TYPE CASTING:** `applications.id` es `bigint`, pero `environment_variables.resourceable_id` y `application_deployment_queues.application_id` son `text`. Usar `::bigint` en JOINs.

**APP_KEY actual de Coolify:** `base64:qYO2PRe1YG5ZcvpuQUKqB7mKPDd7uNxaD6cVf4mr5Do=`

### 6.2 applications

```sql
id BIGSERIAL, uuid TEXT (el UUID visible en UI), name TEXT,
fqdn TEXT (dominio), build_pack TEXT ('nixpacks'|'dockerfile'),
git_repository TEXT, git_branch TEXT, ...
```

### 6.3 application_settings

```sql
application_id TEXT FK→applications (text, with ::bigint cast),
is_auto_deploy_enabled BOOLEAN, build_wait INT (default 300s), ...
```

### 6.4 personal_access_tokens

Usado para autenticación API de Coolify. `tokenable_type` debe ser `App\Models\User` (backslash SIMPLE).

### 6.5 application_deployment_queues

```sql
id BIGSERIAL, application_id TEXT, deployment_uuid UUID,
commit TEXT, status TEXT (queued|in_progress|finished|failed),
force_rebuild BOOLEAN, is_api BOOLEAN, is_webhook BOOLEAN,
logs TEXT, created_at, finished_at, ...
```

---

## 7. COMANDOS ÚTILES PARA DEPLOY

### 7.1 Commit + Push (Método principal)
```bash
cd ~/Documentos/wacrm
npm run lint
npx tsc --noEmit      # Más estricto que el build de Next.js
git add -A
git commit -m "feat: descripción"
git push origin main   # Coolify detecta y deploya automáticamente
```

### 7.2 Redeploy vía Tinker (cuando auto-deploy falla)
```php
// Dentro del contenedor coolify
require_once "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$application = App\Models\Application::where("uuid", "q301kisqnonwrolfk7co4al9")->first();

// Limpiar deployments previos colgados
DB::table("application_deployment_queues")
    ->where("application_id", (string)$application->id)
    ->whereIn("status", ["queued", "in_progress"])
    ->delete();

// Crear nuevo deployment con force_rebuild=true
$deployment_uuid = (string) Str::uuid();
$deployment = $application->deployment_queue()->create([
    "application_id" => (string)$application->id,
    "deployment_uuid" => $deployment_uuid,
    "commit" => "HEAD",
    "force_rebuild" => true,
    "status" => "queued",
    "is_api" => true,
    "is_webhook" => false,
    "pull_request_id" => 0,
    "restart_only" => false,
    "only_this_server" => false,
    "rollback" => false,
    "server_id" => 0,           // OBLIGATORIO — localhost
    "destination_id" => "0",    // OBLIGATORIO
    "application_name" => $application->name,
    "server_name" => "localhost", // OBLIGATORIO
    "deployment_url" => $application->fqdn,
]);

dispatch(new App\Jobs\ApplicationDeploymentJob((int)$deployment->id, $deployment_uuid));
```

### 7.3 Re-crear env var en Coolify DB (vía Tinker)
```php
$env = new App\Models\EnvironmentVariable();
$env->key = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
$env->value = 'eyJ0eX...anon_key_real';   // El setter lo encripta automáticamente
$env->resourceable_type = 'App\Models\Application';
$env->resourceable_id = 1;                 // ID de la app wacrm en applications table
$env->is_buildtime = true;
$env->is_runtime = true;
$env->save();
echo 'OK: ' . $env->id;
```

### 7.4 Verificar estado del deploy
```sql
-- Desde coolify-db
SELECT id, commit, status, created_at, finished_at,
       EXTRACT(EPOCH FROM (finished_at - created_at)) as duration_seconds
FROM application_deployment_queues
WHERE application_id::bigint = (SELECT id FROM applications WHERE uuid='q301kisqnonwrolfk7co4al9')
ORDER BY id DESC LIMIT 3;
```
- duration < 10s → build saltado (SHA duplicado)
- duration > 120s → build real

---

## 8. DIAGNÓSTICO DE PROBLEMAS

### 8.1 Login falla con "Unauthorized"
1. Verificar que el usuario exista en `auth.users` de la instancia correcta
2. Verificar ANON_KEY en 3 capas: Kong → Coolify .env → Contenedor app
3. Las 3 longitudes deben coincidir (~169 chars)
4. Si el usuario existe y keys coinciden → el password puede ser incorrecto

### 8.2 500 en POST /api/flows (creación de flujos)
1. Verificar docker logs del contenedor: buscar "supabaseKey is required"
2. Si aparece → env vars corruptas en Coolify DB (recrear via Tinker + force_rebuild)
3. Si NO aparece → posible error de código en el handler

### 8.3 502 Bad Gateway
1. Verificar YAML estáticos en `/data/coolify/proxy/dynamic/` — respaldar y eliminar si apuntan a contenedor muerto
2. Labels del contenedor activo son la fuente correcta de ruteo
3. `docker restart coolify-proxy` tras limpiar YAML

### 8.4 DecryptException / payload invalid
- APP_KEY de Coolify cambió → todos los env vars encriptados son ilegibles
- Solución: recrear cada env var via Tinker (NO se puede cargar con Eloquent, lanza excepción)

---

## 9. REGLAS DE DESARROLLO

### 9.1 i18n — traducciones
- TODAS las cadenas visibles usan `useTranslations('Namespace')` de next-intl
- Las claves de traducción van en `messages/es.json` y `messages/en.json`
- NUNCA hardcodear texto en español o inglés en componentes
- Para agregar nuevas cadenas: agregar en AMBOS archivos con las mismas keys
- Archivo de configuración: `src/i18n/request.ts` (locale = 'es')

### 9.2 createClient() — CARGA DIFERIDA
En componentes `"use client"`:
```tsx
// ❌ MAL: en module scope o body del componente
const supabase = createBrowserClient()

// ✅ BIEN: dentro de event handlers o hooks
const handleLogin = async () => {
  const supabase = createBrowserClient()
  // ...
}
```

### 9.3 Autenticación
- `requireRole('agent')` para endpoints API protegidos
- `getCurrentAccount()` para obtener la cuenta activa
- RLS en Supabase para todas las tablas

### 9.4 Proveedores de mensajería (nuevos)
Para agregar un nuevo canal:
1. `src/app/api/<provider>/config/route.ts` — GET/POST endpoint
2. `src/components/settings/<provider>-config.tsx` — UI component
3. Registrar en `src/components/settings/settings-sections.ts`
4. Importar en `src/app/(dashboard)/settings/page.tsx`
5. Traducciones en `messages/es.json` y `messages/en.json` bajo `Settings.<provider>`
6. `src/lib/messaging/providers/<provider>.ts` — lógica del provider
7. Usar WhatsApp como referencia — sigue el mismo patrón exacto

### 9.5 Flujos (flow builder)
Para agregar un nuevo tipo de nodo al flow builder:
1. `src/lib/flows/types.ts` — añadir al union `NodeType` + `defaultConfigFor`
2. `src/components/flows/shared.tsx` — entry en `NODE_META`
3. `src/components/flows/nodes/<NodeType>.tsx` — componente del nodo
4. `src/lib/flows/engine.ts` — lógica de ejecución del nodo
5. Traducciones en `messages/`
6. `src/lib/flows/validators.ts` — validación del nodo

---

## 10. HISTORIAL DE DECISIONES TÉCNICAS

| Fecha | Decisión | Razón |
|-------|----------|-------|
| Jul 2026 | Build pack = nixpacks | Dockerfile también disponible pero nixpacks es el actual |
| Jul 2026 | createClient() carga diferida en client pages | Next.js prerender falla con NEXT_PUBLIC_* undefined en build-time |
| Jul 2026 | ANON_KEY corregida desde Kong (fuente de verdad) | Coolify .env tenía `...` corruptos |
| Jul 2026 | force_rebuild=true necesario para refrescar NEXT_PUBLIC_* | Sin esto, build salta por SHA duplicado |
| Jul 2026 | `is_account_member()` como helper RLS | Patrón consistente multi-tenant |
| Jul 2026 | Columnas `channel` agregadas a `messages` | Evitar JOIN a conversations en dashboard metrics |

---

## 11. SCRIPT DE VERIFICACIÓN POST-DEPLOY

```bash
# 1. Verificar env vars en contenedor
CONTAINER=$(ssh root@187.127.45.42 "docker ps --filter name=q301kisqnonwrolfk7co4al9 --format '{{.Names}}' | head -1")
ssh root@187.127.45.42 "docker logs $CONTAINER 2>&1 | grep -c 'supabaseKey is required'"
# → 0 = OK

# 2. Verificar login en navegador
# Cargar https://wacrm.sistemasagenticos.cloud/login y probar login con credenciales

# 3. Verificar 3 páginas críticas
# - Dashboard (métricas)
# - Flujos Beta (sin 500)
# - Bandeja de entrada (contactos visibles)

# 4. Endpoint API (debe dar 401 sin sesión — antes daba 500)
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://wacrm.sistemasagenticos.cloud/api/flows
# → 401 = correcto
```

---

## 12. LINKS RÁPIDOS

| Recurso | URL/Link |
|---------|----------|
| Producción | https://wacrm.sistemasagenticos.cloud |
| Coolify Panel | https://coolify.sistemasagenticos.cloud |
| Supabase (Kong) | https://crmssag-supabase.sistemasagenticos.cloud |
| Repo GitHub | https://github.com/grupoprosperyn8n/wacrm |
| VPS SSH | `ssh -i ~/.ssh/id_hermes_coolify root@187.127.45.42` |
| Carpeta local | `/home/diegol/Documentos/wacrm/` |
| Obsidian notas | `/home/diegol/Documentos/Obsidian/Mente Brillante/Stack/wacrm.md` |

---

**FIN DEL DOCUMENTO.** Codex ya tiene todo el contexto necesario para continuar el desarrollo de wacrm sin preguntas recurrentes.
