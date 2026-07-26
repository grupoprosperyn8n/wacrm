// YouTube provider — comment management via YouTube Data API v3
// Unlike other channels, YouTube uses OAuth2 for comment replies.
// Config stored in channels.config as:
// {
//   api_key: string,       // YouTube Data API key
//   channel_id: string     // Your YouTube channel ID
// }

import type { SupabaseClient } from '@supabase/supabase-js'

export interface YouTubeConfig {
  api_key: string
  channel_id: string
}

export async function getYouTubeConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<YouTubeConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'youtube')
    .eq('is_active', true)
    .maybeSingle()

  if (!data?.config) return null
  const c = data.config as Record<string, unknown>
  if (!c.api_key || typeof c.api_key !== 'string') return null
  if (!c.channel_id || typeof c.channel_id !== 'string') return null
  return { api_key: c.api_key, channel_id: c.channel_id }
}

/** Fetch recent comments from your channel videos. */
export async function fetchYouTubeComments(
  config: YouTubeConfig,
  maxResults = 20,
): Promise<{ commentId: string; videoId: string; text: string; author: string; publishedAt: string }[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${config.channel_id}&maxResults=${maxResults}&key=${config.api_key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  return (data.items || []).map((item: any) => ({
    commentId: item.id,
    videoId: item.snippet.videoId,
    text: item.snippet.topLevelComment.snippet.textDisplay,
    author: item.snippet.topLevelComment.snippet.authorDisplayName,
    publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
  }))
}

/** Reply to a YouTube comment. */
export async function replyToYouTubeComment(
  config: YouTubeConfig,
  commentId: string,
  text: string,
): Promise<{ messageId: string }> {
  const url = 'https://www.googleapis.com/youtube/v3/comments?part=snippet&key=' + config.api_key
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: {
        parentId: commentId,
        textOriginal: text,
      },
    }),
  })
  if (!res.ok) throw new Error(`YouTube reply error: ${res.status}`)
  const data = await res.json()
  return { messageId: data.id }
}

/** Send a text reply to a YouTube conversation (comment thread). */
export async function sendYouTubeText(
  config: YouTubeConfig,
  commentId: string,
  text: string,
): Promise<{ messageId: string; externalMessageId: string }> {
  const result = await replyToYouTubeComment(config, commentId, text)
  return { messageId: `yt-${result.messageId}`, externalMessageId: result.messageId }
}
