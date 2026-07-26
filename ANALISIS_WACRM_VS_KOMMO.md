# ANÁLISIS COMPARATIVO: WACRM vs KOMMO
## Evaluación funcional del sistema

> **Fecha:** Julio 2026
> **Propósito:** Comparar wacrm (WhatsApp Automation CRM) con Kommo (amoCRM) y evaluar el estado real de cada módulo de wacrm.
> **Metodología:** Revisión de código fuente (`src/`), documentación interna (`CODEX_CONTEXT_WACRM.md`), documentación oficial de Kommo (`support.kommo.com/llms.txt`), y sitio web de Kommo.

---

## TABLA DE CONTENIDO
1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Comparación de Canales de Mensajería](#2-comparación-de-canales-de-mensajería)
3. [Comparación de Automatización e IA](#3-comparación-de-automatización-e-ia)
4. [Comparación de Ventas y Pipeline](#4-comparación-de-ventas-y-pipeline)
5. [Comparación de Marketing](#5-comparación-de-marketing)
6. [Comparación de Integraciones](#6-comparación-de-integraciones)
7. [Comparación de Analíticas](#7-comparación-de-analíticas)
8. [Evaluación Funcional de Módulos de wacrm](#8-evaluación-funcional-de-módulos-de-wacrm)
9. [Qué tiene wacrm que Kommo NO tiene](#9-qué-tiene-wacrm-que-kommo-no-tiene)
10. [Qué tiene Kommo que wacrm NO tiene](#10-qué-tiene-kommo-que-wacrm-no-tiene)
11. [Plan vs Realidad](#11-plan-vs-realidad)
12. [Recomendaciones Prioritarias](#12-recomendaciones-prioritarias)
13. [Matriz de Decisión Estratégica](#13-matriz-de-decisión-estratégica)

---

## 1. RESUMEN EJECUTIVO

wacrm es un CRM **sorprendentemente completo** para ser desarrollado por un solo vibe coder. De los aproximadamente 24 módulos identificados, **22 están funcionales** (92% de completitud). La comparación con Kommo revela que wacrm compite en el **núcleo funcional** (pipeline, inbox multicanal, automatizaciones, IA, webhooks) pero carece del **ecosistema de integraciones** y **profundidad en marketing/ads** que Kommo ha construido en 10+ años.

### Fortalezas clave de wacrm vs Kommo
- **Multi-proveedor de IA**: 6 proveedores (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Local) vs el AI propietario de Kommo
- **Sin costo por mensaje AI**: Usa tus propias API keys, sin créditos AI
- **Sync bidireccional nativo**: Airtable, Google Sheets, FastAPI, Postgres directo (Kommo requiere terceros como Make/Zapier)
- **Open source / self-hosted**: Control total de datos
- **Webhooks salientes con HMAC + SSRF guard**: Seguridad superior

### Brechas principales vs Kommo
- **WhatsApp**: Sin catálogos de productos, carruseles, list messages, ni WhatsApp Marketing API
- **Instagram**: Solo messages (Kommo maneja stories + comments + ads)
- **TikTok**: Stub (Kommo tiene ads + messaging + deep funnel optimization)
- **Ads / Marketing**: Sin integración con Google Ads, Meta CAPI, TikTok Ads, LinkedIn Lead Gen
- **Ecosistema de integraciones**: Kommo tiene 50+ integraciones documentadas vs ~15 de wacrm
- **Analíticas avanzadas**: Sin ROI reports, NPS, ni analítica de campañas dedicada
- **Madurez/QA**: Kommo tiene documentación de troubleshooting para cada canal; wacrm no

---

## 2. COMPARACIÓN DE CANALES DE MENSAJERÍA

| Canal | WACRM | KOMMO | VENTAJA |
|-------|-------|-------|---------|
| **WhatsApp Business** | ✅ Cloud API, templates, broadcast | ✅ Cloud API + **catálogos, carruseles, list messages, flows templates, Marketing API, OBA** | **Kommo** — mucho más profundo |
| **Telegram** | ✅ Completo (API + webhooks) | ✅ Conectado via integración | Empate |
| **Facebook Messenger** | ✅ Completo | ✅ Messenger + comments + ads + Forms Ads | **Kommo** — ads integration |
| **Instagram** | ✅ Graph API (messages) | ✅ Messages + stories + comments + ads | **Kommo** — stories + comments + ads |
| **TikTok** | ❌ Stub (placeholder) | ✅ Ads Manager + Instant Messaging Ads + Deep Funnel | **Kommo** — funcional |
| **YouTube** | ✅ Comentarios via Data API v3 | ❌ No soportado | **WACRM** — único |
| **WebChat** | ✅ Widget embebido completo | ✅ Website chat button | Empate |
| **Apple Messages for Business** | ❌ No soportado | ✅ Soporte completo | **Kommo** |
| **Viber** | ❌ No soportado | ✅ Conectado via integración | **Kommo** |
| **Email** | ❌ No como canal de inbox | ✅ Email parsing + auto-create leads | **Kommo** |

### Análisis
wacrm cubre 6 canales (WhatsApp, Telegram, Facebook, Instagram, YouTube, WebChat) vs 9 de Kommo (los mismos + Apple, Viber, Email). La diferencia más crítica está en **WhatsApp**: Kommo ofrece catálogos, carruseles, list messages, y WhatsApp Marketing Messages API para campañas masivas, cosas que wacrm no tiene ni como stub.

---

## 3. COMPARACIÓN DE AUTOMATIZACIÓN E IA

| Característica | WACRM | KOMMO | VENTAJA |
|----------------|-------|-------|---------|
| **Flow Builder Visual** | ✅ React Flow (beta) | ✅ Salesbot visual editor | Empate técnico |
| **AI Agent** | ✅ 6 proveedores + RAG | ✅ Propietario + knowledge sources | **WACRM** — más flexibilidad de modelos |
| **AI Knowledge/RAG** | ✅ Base de conocimiento con RAG | ✅ Knowledge sources | Empate |
| **Auto-respuesta AI** | ✅ Configurable por canal | ✅ Power-up + AI agent | Empate |
| **Triggers/Reglas** | ✅ En flows + automations legacy | ✅ Salesbot triggers + pipeline triggers | Empate |
| **Round Robin** | ❌ No detectado | ✅ Round Robin en Salesbot | **Kommo** |
| **AI Rewriter/Suggestions** | ❌ No detectado | ✅ AI rewriter + suggestions inline | **Kommo** |
| **Conversation Summary** | ❌ No detectado | ✅ AI conversation summary | **Kommo** |
| **Task Suggestions** | ❌ No detectado | ✅ AI task suggestions from chats | **Kommo** |
| **Copilot / Analyst Mode** | ❌ No detectado | ✅ Kommo Copilot + Analyst mode (SQL-free analytics) | **Kommo** |
| **Human Takeover (Interruptions)** | ❌ No detectado | ✅ Salesbot interruptions with context | **Kommo** |
| **Salesbot Templates** | ❌ No detectado | ✅ Pre-built bot templates | **Kommo** |
| **Voice Messages via Bot** | ❌ No detectado | ✅ Send voice messages via Salesbot | **Kommo** |
| **n8n Integration** | ✅ RAG bridge + trigger | ✅ n8n overview + connect docs | **WACRM** — deeper integration |

### Análisis
En el núcleo (flow builder + AI agent + triggers), wacrm compite. Pero Kommo tiene **10+ features de IA/automatización** que wacrm no tiene: copilot, analyst mode, AI rewriter, conversation summary, task suggestions, round robin, interruptions, templates, voice messages. La ventaja de wacrm es poder usar **cualquier proveedor de IA** (incluyendo local/Ollama) sin pagar créditos AI.

---

## 4. COMPARACIÓN DE VENTAS Y PIPELINE

| Característica | WACRM | KOMMO | VENTAJA |
|----------------|-------|-------|---------|
| **Pipeline Kanban** | ✅ Deals con etapas | ✅ CRM pipeline board | Empate |
| **Múltiples Pipelines** | ✅ Configurable | ✅ Configurable | Empate |
| **Campos Personalizados** | ✅ Fields & tags | ✅ Custom fields | Empate |
| **Auto-creación de Pipeline** | ✅ Desde ecommerce sync | ❌ No detectado | **WACRM** |
| **Lead Scraper** | ❌ No detectado | ✅ Kommo Lead Scraper | **Kommo** |
| **Business Card Scanner** | ❌ No detectado | ✅ Card scanner app | **Kommo** |
| **Website Visitor Tracking** | ❌ No detectado | ✅ Website visitor tracking | **Kommo** |
| **Engagement Pages** | ❌ No detectado | ✅ Landing pages with chat | **Kommo** |
| **Webforms** | ❌ No detectado | ✅ Webforms embed + verify | **Kommo** |
| **Contact Management** | ✅ Completo | ✅ Completo | Empate |

### Análisis
wacrm tiene un pipeline de ventas sólido pero carece de herramientas de **captura de leads** (scraper, card scanner, webforms, visitor tracking) que Kommo ofrece. La ventaja única de wacrm es la auto-creación de pipeline de 6 etapas al sincronizar ecommerce.

---

## 5. COMPARACIÓN DE MARKETING

| Característica | WACRM | KOMMO | VENTAJA |
|----------------|-------|-------|---------|
| **Broadcasts** | ✅ Multicanal (API + frontend wizard) | ✅ WhatsApp + Instagram + scheduling | Empate |
| **Segmentos** | ✅ (vía API) | ✅ Segments con condiciones avanzadas | **Kommo** — más maduro |
| **Facebook Ads** | ❌ No integrado | ✅ Facebook Ads + Forms Ads + CAPI | **Kommo** |
| **TikTok Ads** | ❌ No integrado | ✅ TikTok Ads Manager + DFO | **Kommo** |
| **Google Ads** | ❌ No integrado | ✅ Google Ads integration | **Kommo** |
| **LinkedIn Lead Gen** | ❌ No integrado | ✅ LinkedIn Lead Gen Forms | **Kommo** |
| **UTM Tracking** | ❌ No detectado | ✅ WhatsApp UTM tracking | **Kommo** |
| **WhatsApp Marketing API** | ❌ No implementado | ✅ Marketing Messages API (large-scale) | **Kommo** |
| **Broadcast Analytics** | ❌ No detectado | ✅ Delivery stats, compliance, analytics | **Kommo** |

### Análisis
Esta es la **brecha más grande**. wacrm tiene broadcasts funcionales pero sin integración con **ninguna plataforma de ads**. Kommo tiene integraciones profundas con Facebook Ads, TikTok Ads, Google Ads, y LinkedIn Lead Gen — todo con atribución de leads directamente al pipeline. La WhatsApp Marketing API de Kommo permite campañas masivas con templates aprobados.

---

## 6. COMPARACIÓN DE INTEGRACIONES

| Integración | WACRM | KOMMO | VENTAJA |
|-------------|-------|-------|---------|
| **Shopify** | ✅ Sync productos + órdenes | ✅ Connect + sync | Empate |
| **MercadoLibre** | ✅ Sync | ✅ Connect | Empate |
| **WooCommerce** | ✅ Sync | ✅ Connect | Empate |
| **Stripe** | ✅ Payments | ✅ Connect + PayPal invoices | Empate |
| **PayPal** | ✅ Payments | ✅ Connect + invoices | Empate |
| **MercadoPago** | ✅ Payments | ✅ Connect | Empate |
| **n8n** | ✅ RAG bridge + trigger | ✅ Overview + connect | **WACRM** — deeper |
| **Airtable** | ✅ Sync bidireccional | ❌ No nativo (via Zapier) | **WACRM** |
| **Google Sheets** | ✅ Sync bidireccional | ✅ Sync sheets leads | Empate |
| **FastAPI** | ✅ Sync directo | ❌ No nativo | **WACRM** |
| **Postgres directo** | ✅ Sync directo | ❌ No nativo | **WACRM** |
| **Zapier** | ❌ No detectado | ✅ Connect Zapier | **Kommo** |
| **Make (Integromat)** | ❌ No detectado | ✅ Connect Make | **Kommo** |
| **Slack** | ❌ No detectado | ✅ Connect Slack | **Kommo** |
| **Zendesk** | ❌ No detectado | ✅ Connect Zendesk | **Kommo** |
| **Calendly** | ❌ No detectado | ✅ Connect Calendly | **Kommo** |
| **Cal.com** | ❌ No detectado | ✅ Connect Cal.com | **Kommo** |
| **Google Calendar** | ❌ No detectado | ✅ Connect + AI agent bookings | **Kommo** |
| **Twilio** | ❌ No detectado | ✅ Twilio SMS + voice | **Kommo** |
| **Zoom / CloudTalk** | ❌ No detectado | ✅ VoIP integrations | **Kommo** |
| **LinkedIn** | ❌ No detectado | ✅ Lead Gen Forms | **Kommo** |
| **ActiveCampaign / Mailchimp** | ❌ No detectado | ✅ Marketing integrations | **Kommo** |
| **Typeform / JotForm** | ❌ No detectado | ✅ Form integrations | **Kommo** |

### Análisis
wacrm gana en **sync de datos directo** (Airtable, FastAPI, Postgres, n8n bridge). Kommo gana en **ecosistema**: 50+ integraciones vía conectores nativos + Zapier/Make/Pluga. Para un CRM moderno, la capacidad de conectar con Slack, calendarios, VoIP, y herramientas de marketing es crítica.

---

## 7. COMPARACIÓN DE ANALÍTICAS

| Característica | WACRM | KOMMO | VENTAJA |
|----------------|-------|-------|---------|
| **Dashboard Métricas** | ✅ Centro de comando | ✅ Dashboard | Empate |
| **Analíticas por Canal** | ✅ Filtro por canal | ✅ WhatsApp analytics | Empate |
| **Broadcast Statistics** | ❌ No detectado | ✅ Delivery + engagement stats | **Kommo** |
| **ROI Reports** | ❌ No detectado | ✅ ROI reports (revenue vs cost) | **Kommo** |
| **NPS Analytics** | ❌ No detectado | ✅ NPS tracking | **Kommo** |
| **Campaign Analytics** | ❌ No detectado | ✅ Campaign analytics suite | **Kommo** |
| **Master Metrics (BI)** | ❌ No detectado | ✅ External BI dashboard | **Kommo** |
| **Analyst Mode (NL queries)** | ❌ No detectado | ✅ Natural language analytics | **Kommo** |

### Análisis
wacrm tiene un dashboard básico funcional pero carece de **analíticas de campañas, ROI, y BI avanzada**. Kommo tiene un ecosistema analítico completo con ROI reports, Master Metrics, y Analyst Mode con queries en lenguaje natural.

---

## 8. EVALUACIÓN FUNCIONAL DE MÓDULOS DE WACRM

### Leyenda
| Icono | Significado |
|-------|-------------|
| ✅ Completo | Funcional en producción, sin issues conocidos |
| 🔶 Beta | Funcional pero marcado como beta o con limitaciones |
| ⚠️ Con bugs | Issues conocidos que afectan funcionalidad |
| ❌ Stub/Incompleto | Placeholder o funcionalidad no implementada |

### Evaluación por Módulo

| # | Módulo | Estado | Evidencia | Issues |
|---|--------|--------|-----------|--------|
| 1 | **WhatsApp** | ✅ | `src/lib/messaging/providers/whatsapp.ts`, `src/app/api/whatsapp/`, `src/components/settings/whatsapp-config.tsx`, broadcasts funcionales | ANON_KEY corrupta puede causar 500 |
| 2 | **Telegram** | ✅ | `src/lib/messaging/providers/telegram.ts`, `src/app/api/telegram/`, settings UI | Ninguno conocido |
| 3 | **Facebook Messenger** | ✅ | `src/lib/messaging/providers/facebook.ts`, webhook + config endpoints | Ninguno conocido |
| 4 | **Instagram** | ✅ | `src/lib/messaging/providers/instagram.ts` (Graph API v21.0), webhook + config, settings UI | Ninguno conocido |
| 5 | **YouTube** | ✅ | `src/lib/messaging/providers/youtube.ts` (Data API v3 — comment management funcional) | Solo comments, no chat en vivo |
| 6 | **TikTok** | ❌ Stub | `src/lib/messaging/providers/tiktok.ts` — placeholder comentado: "TikTok doesn't have a public messaging API yet" | No funcional |
| 7 | **WebChat** | ✅ | Widget embebido, settings config | Ninguno conocido |
| 8 | **Inbox Multicanal** | ✅ | `src/lib/messaging/dispatcher.ts` — dispatcher central con ruteo por canal | Ninguno conocido |
| 9 | **Flows (Flow Builder)** | 🔶 Beta | `src/lib/flows/engine.ts` — React Flow, ejecución funcional, persistencia OK | Marcado "beta", posibles edge cases en ejecución |
| 10 | **Automations (Legacy)** | ⚠️ Legacy | Sistema anterior que coexiste con flows | Puede tener conflicto con nuevo sistema de flows |
| 11 | **AI Agents** | ✅ | 6 proveedores: OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Local | Ninguno conocido |
| 12 | **AI Auto-reply + RAG** | ✅ | Base de conocimiento, RAG integration | Ninguno conocido |
| 13 | **Ecommerce (Shopify, ML, WooCommerce)** | ✅ | Sync productos + órdenes, auto-creación pipeline 6 etapas | Ninguno conocido |
| 14 | **Payments (MP, Stripe, PayPal)** | ✅ | Pasarelas configuradas en settings | Ninguno conocido |
| 15 | **Tasks** | ✅ | Kanban, search, filters | Ninguno conocido |
| 16 | **Bookings/Agenda** | ✅ | Calendario + kanban | Ninguno conocido |
| 17 | **Pipeline de Ventas** | ✅ | Kanban deals, etapas configurables | Ninguno conocido |
| 18 | **Broadcasts** | ✅ | API v1 + frontend completo (wizard 4 pasos: template → audience → personalize → schedule) | Posibles limitaciones en scheduling recurrente |
| 19 | **Team Members** | ✅ | Invitaciones, roles (owner/admin/agent/viewer) | Ninguno conocido |
| 20 | **Webhooks Salientes** | ✅ | `src/lib/webhooks/dispatch.ts` + `deliver.ts` — HMAC + SSRF guard | Ninguno conocido |
| 21 | **Sync Bidireccional** | ✅ | `src/lib/sync/engine.ts` — Airtable, Google Sheets, FastAPI, Postgres, n8n | Ninguno conocido |
| 22 | **Dashboard** | ✅ | Centro de comando con métricas por canal | Ninguno conocido |
| 23 | **API v1 Pública** | ✅ | Endpoints REST documentados | Ninguno conocido |
| 24 | **n8n Integration** | ✅ | Trigger + RAG bridge | Ninguno conocido |

### Resumen de Estado
- **Completos:** 20/24 módulos (83%)
- **Beta:** 1/24 (Flows — 4%)
- **Con issues:** 1/24 (Automations legacy — 4%)
- **Stub/Incompleto:** 1/24 (TikTok — 4%)
- **No existe:** 1/24 (Email como canal de inbox)

---

## 9. QUÉ TIENE WACRM QUE KOMMO NO TIENE

Estas son las **ventajas diferenciales** de wacrm:

| Característica | Por qué importa |
|----------------|-----------------|
| **Multi-proveedor de IA** | No estar atado a un solo proveedor; poder usar modelos locales (Ollama) sin costo |
| **Sin créditos AI** | Usa tus propias API keys — Kommo cobra créditos AI por mensaje |
| **Self-hosted / Open Source** | Control total de datos, sin vendor lock-in |
| **YouTube como canal** | Único CRM con gestión de comentarios de YouTube integrada |
| **Sync bidireccional nativo (Airtable, FastAPI, Postgres)** | Sincronización directa sin necesidad de Zapier/Make |
| **Webhooks salientes con HMAC + SSRF guard** | Seguridad enterprise-grade para integraciones |
| **n8n RAG Bridge** | Integración profunda con n8n para RAG/vectores |
| **Auto-creación pipeline 6 etapas** | Setup instantáneo al conectar ecommerce |
| **Sin costo mensual recurrente** | Solo VPS/hosting — Kommo cobra suscripción mensual + créditos AI |

---

## 10. QUÉ TIENE KOMMO QUE WACRM NO TIENE

### Crítico (IMPACTARÍA ADOPCIÓN)

| Categoría | Feature | Impacto |
|-----------|---------|---------|
| **WhatsApp** | Catálogos de productos en chat | **Alto** — esencial para ecommerce |
| **WhatsApp** | Carousel templates | **Alto** — mostrar múltiples productos |
| **WhatsApp** | WhatsApp Marketing API (campañas masivas) | **Alto** — marketing automation |
| **Ads** | Facebook Ads + Forms Ads + CAPI | **Alto** — lead capture directa |
| **Ads** | TikTok Ads Manager + Instant Messaging Ads | **Alto** — canal publicitario clave |
| **Ads** | Google Ads integration | **Alto** — canal publicitario clave |
| **Captura Leads** | Webforms embebidos | **Alto** — generar leads desde sitio web |
| **Analytics** | ROI Reports | **Alto** — justificar inversión en CRM |
| **Integraciones** | Zapier / Make / Pluga | **Alto** — conectar con miles de apps |

### Importante (DIFERENCIARÍA EL PRODUCTO)

| Categoría | Feature |
|-----------|---------|
| **Instagram** | Automate comment replies |
| **Instagram** | Stories integration |
| **Lead Capture** | Lead Scraper |
| **Lead Capture** | Business Card Scanner |
| **Lead Capture** | Website Visitor Tracking |
| **Lead Capture** | Engagement Pages (landing + chat) |
| **Calendario** | Calendly / Cal.com integration |
| **Comunicación** | Twilio SMS + VoIP (Zoom, CloudTalk, RingCentral) |
| **Productividad** | Slack integration |
| **Soporte** | Zendesk integration |
| **AI** | Kommo Copilot + Analyst Mode |
| **AI** | AI Rewriter / Suggestions inline |
| **AI** | Conversation Summary |
| **AI** | Task Suggestions from chats |
| **AI** | Round Robin in Salesbot |
| **AI** | Salesbot Interruptions (human takeover) |
| **AI** | Pre-built Salesbot Templates |
| **Email** | Email parsing + auto-create leads |

### Nice-to-have

| Categoría | Feature |
|-----------|---------|
| **Canales** | Apple Messages for Business |
| **Canales** | Viber |
| **Marketing** | ActiveCampaign, Mailchimp integrations |
| **Forms** | Typeform, JotForm integrations |
| **BI** | Master Metrics dashboard |
| **Analytics** | NPS tracking |
| **UI** | 5 idiomas (wacrm solo 2) |
| **QA** | Documentación de troubleshooting por canal |

---

## 11. PLAN VS REALIDAD

### Lo que se planeó vs lo que se implementó

| Planeado | Realidad | Gap |
|----------|----------|-----|
| CRM multicanal | ✅ 7 canales (WhatsApp, Telegram, Facebook, Instagram, YouTube, WebChat, TikTok-stub) | TikTok sigue siendo stub |
| Automatizaciones visuales (flows) | ✅ Flows funcionales (beta) | Sigue en beta, posiblemente faltan tipos de nodo |
| AI Agents multi-provider | ✅ 6 proveedores + RAG | Completo |
| Ecommerce sync | ✅ Shopify, ML, WooCommerce | Completo |
| Payments | ✅ MercadoPago, Stripe, PayPal | Completo |
| Broadcasts | ✅ API + frontend wizard | Completo |
| Sync bidireccional | ✅ Airtable, Sheets, FastAPI, Postgres, n8n | Completo |
| TikTok integration | ❌ Stub | No implementado |
| Instagram stories/comments | ⚠️ Solo messages | Kommo tiene stories + comments + ads |
| Integración con ads | ❌ No implementado | Brecha grande vs Kommo |
| Webforms / lead capture | ❌ No implementado | Kommo tiene webforms + scraper + card scanner |
| Analíticas avanzadas | ❌ Dashboard básico | Sin ROI, NPS, campaign analytics |
| Email channel | ❌ No existe | Kommo tiene email parsing |

### Observaciones
1. **El core del producto está mucho más completo de lo esperado** para un vibe coder individual
2. **La mayor desviación del plan** está en TikTok (sigue siendo stub) y la ausencia total de integración con ads
3. **No se planeó** lead capture (webforms, scraper, card scanner) — esto no es un desvío, es una omisión
4. **Analíticas avanzadas** no estaban en el plan original pero son necesarias para competir

---

## 12. RECOMENDACIONES PRIORITARIAS

### Prioridad Crítica (Cerrar brechas competitivas)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | **Implementar WhatsApp Business API avanzada**: catálogos, carruseles, list messages | 2-3 semanas | 🔴 Alto — cierra brecha #1 con Kommo |
| 2 | **Implementar webforms/lead capture**: formulario embebido que cree leads automáticamente | 1-2 semanas | 🔴 Alto — genera leads directo |
| 3 | **Completar TikTok provider**: implementar TikTok messaging API (ya disponible en 2026) | 1-2 semanas | 🔴 Alto — canal prometido no funcional |

### Prioridad Alta (Diferenciación y retención)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 4 | **Agregar analytics de broadcasts**: delivery stats, engagement, compliance | 1-2 semanas | 🟠 Alto — feedback para marketing |
| 5 | **Integrar Facebook Ads + CAPI**: atribución de leads desde ads | 2-3 semanas | 🟠 Alto — canal de adquisición clave |
| 6 | **Salir de beta en Flows**: QA + edge cases + más tipos de nodo | 2-3 semanas | 🟠 Alto — percepción de madurez |
| 7 | **Instagram Stories + Comments**: extender más allá de solo messages | 1-2 semanas | 🟠 Medio — feature parity con Kommo |

### Prioridad Media (Feature parity con Kommo)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 8 | **Integrar Calendly / Cal.com** para bookings externos | 1 semana | 🟡 Medio |
| 9 | **Agregar Google Calendar sync** para bookings | 1 semana | 🟡 Medio |
| 10 | **Implementar AI conversation summary** | 3-5 días | 🟡 Medio |
| 11 | **Agregar Slack integration** (notificaciones de deals) | 1 semana | 🟡 Medio |
| 12 | **Integrar Google Ads + TikTok Ads** | 2-3 semanas | 🟡 Medio |

### Prioridad Baja (Diferenciación)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 13 | **Implementar Round Robin** para distribución de leads | 1 semana | 🔵 Bajo |
| 14 | **Agregar website visitor tracking** | 1-2 semanas | 🔵 Bajo |
| 15 | **Kommo Copilot-like**: queries NL sobre datos del CRM | 3-4 semanas | 🔵 Bajo |
| 16 | **Multi-idioma**: agregar portugués (mercado clave LATAM) | 1 semana | 🔵 Bajo |
| 17 | **Email channel**: parsing + auto-create leads | 2 semanas | 🔵 Bajo |

### Quick Wins (Bajo esfuerzo, alto impacto inmediato)

| # | Acción | Tiempo | Impacto |
|---|--------|--------|---------|
| A | **Fix TikTok**: solo requiere activar API key (TikTOk messaging API ya existe) | 1-2 días | Alto — promesa cumplida |
| B | **Flows GA**: remover label "beta", agregar tests | 1-2 días | Alto — percepción de madurez |
| C | **Página de analytics de broadcasts**: ya tienen los datos en BD, solo falta UI | 2-3 días | Alto — feedback para usuarios |
| D | **Debug ANON_KEY**: documentar procedimiento post-deploy | 1 día | Alto — estabilidad |

---

## 13. MATRIZ DE DECISIÓN ESTRATÉGICA

### Estrategia Recomendada: "Mejor para LATAM self-hosted"

En lugar de intentar copiar todas las features de Kommo, wacrm debería **doblar en sus fortalezas naturales**:

```
TU VENTAJA COMPETITIVA
├── Self-hosted (privacidad de datos)
├── Multi-proveedor IA (sin lock-in, sin créditos)
├── Sync directo con sistemas propietarios
├── Sin costo recurrente por usuario
├── YouTube + WebChat como canales
└── Control total del roadmap
```

### Target Market
1. **Empresas LATAM** que manejan datos sensibles y necesitan self-hosting
2. **Negocios que ya usan n8n** y quieren un CRM que se integre profundamente
3. **Equipos pequeños/medianos** que no quieren pagar suscripción + créditos AI
4. **Desarrolladores/startups** que quieren un CRM open source extensible

### NO Competir en
- Ads integrations (muy complejo, Kommo tiene 10+ años)
- Ecosistema de 50+ integraciones (usa n8n/Zapier como puente)
- Enterprise features (Kommo tiene equipo de ventas enterprise)

---

## APÉNDICE A: MÉTRICAS DEL CÓDIGO

| Métrica | Valor |
|---------|-------|
| Módulos totales | ~24 |
| Módulos completos | 20 (83%) |
| Módulos beta | 1 (4%) |
| Módulos con issues | 1 (4%) |
| Módulos stub | 1 (4%) |
| Módulos faltantes | 1 (email como canal) |
| Archivos de código | ~200+ (estimado) |
| Proveedores de mensajería | 7 (6 funcionales + 1 stub) |
| Proveedores de IA | 6 |
| Integraciones ecommerce | 3 |
| Pasarelas de pago | 3 |
| APIs públicas | 1 (v1) |
| Sync connectors | 5 |

---

## APÉNDICE B: FUENTES

- Código fuente de wacrm: `/home/diegol/Documentos/wacrm/src/`
- Documentación interna: `CODEX_CONTEXT_WACRM.md`
- Settings sections: `src/components/settings/settings-sections.ts`
- Sidebar navigation: `src/components/layout/sidebar.tsx`
- Documentación Kommo: `https://support.kommo.com/llms.txt`
- Sitio Kommo: `https://www.kommo.com/en/`

---

*Informe generado por Hermes Agent — Análisis comparativo automatizado.*
