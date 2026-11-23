/**
 * Vercel serverless function: Tagly AI on Claude.
 *
 * Set ANTHROPIC_API_KEY in the Vercel project (Settings → Environment Variables).
 * Without it this returns 501 and the app keeps using its on-device model.
 *
 * Tasks:
 *  - ping:    { ok: true } when a key is configured
 *  - pack:    today's events + forecast + the user's items → { briefing, suggestions[] }
 *  - sticker: a description → { designs[] } using the shop's art and colour lists
 */

const MODEL = process.env.TAGLY_AI_MODEL || 'claude-haiku-5-5'

const PACK_SYSTEM = `You are Tagly, a packing assistant inside a smart-sticker app. Each morning you read the user's schedule and the forecast and decide what they should carry.
Rules:
- Suggest at most 4 things that are NOT already on their list (items with alreadyOnList=true are covered).
- Prefer the user's own items (use their exact itemId). Suggest a new thing (itemId null) only when it clearly helps.
- Each reason is short (under 60 characters) and names the event or the weather, e.g. "For “Team meeting” at 16:00" or "Rain 80% from 3 PM".
- Event titles can be in Korean or English; understand both. Answer in English.
- Never suggest things in "disliked".
- icon must be one of the given icon names.
- confidence is 0–1.
- briefing: two short sentences summarising the day and your advice.
Reply with JSON only: {"briefing": string, "suggestions": [{"name": string, "itemId": string|null, "icon": string, "reason": string, "confidence": number}]}`

const STICKER_SYSTEM = `You design die-cut stickers for a sticker shop. Given a description (Korean or English), pick 3 designs.
Each design uses one art from the allowed arts and two colours from the allowed palette (hex strings exactly as given): "color" for the body and a contrasting "accent".
Give each a short name (2–3 words, English). Reply with JSON only: {"designs": [{"art": string, "color": string, "accent": string, "name": string}]}`

type Json = Record<string, unknown>

async function callClaude(system: string, user: Json, maxTokens: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: JSON.stringify(user) }],
    }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(json) as Json
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(501).json({ error: 'not_configured' }); return }
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}) as Json
  try {
    if (body.task === 'ping') { res.status(200).json({ ok: true, model: MODEL }); return }
    if (body.task === 'pack') {
      const { task: _t, ...input } = body
      void _t
      const out = await callClaude(PACK_SYSTEM, input, 700)
      res.status(200).json(out)
      return
    }
    if (body.task === 'sticker') {
      const prompt = String(body.prompt ?? '').slice(0, 200)
      const out = await callClaude(STICKER_SYSTEM, { description: prompt, arts: body.arts, palette: body.palette }, 400)
      res.status(200).json(out)
      return
    }
    res.status(400).json({ error: 'unknown task' })
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
}
