import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(501).json({ error: 'AI assistant not configured' });
    return;
  }

  const { query, ideas } = req.body || {};
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  const pool = Array.isArray(ideas) ? ideas.slice(0, 300) : [];

  try {
    const client = new Anthropic();
    const ideaList = pool
      .map((i) => `- id: ${i.id}\n  captured: ${i.created_at}\n  tags: ${(i.tags || []).join(', ') || 'none'}\n  content: ${i.content}`)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      system:
        'You are a helpful personal assistant that helps the user retrieve and recall unorganized notes ("ideas") they previously dumped into their idea tracker. ' +
        'Given the user\'s question and a list of their captured ideas, find the ones most relevant to the question. ' +
        'Reply ONLY with strict JSON of the shape {"text": string, "matchIds": string[]}. ' +
        '"text" is a short (1-3 sentence), warm, conversational answer referencing what you found (or say plainly if nothing matches). ' +
        '"matchIds" is the list of idea ids (from the "id" field) you are referencing, most relevant first, at most 5. ' +
        'Do not include any text outside the JSON object.',
      messages: [
        {
          role: 'user',
          content: `Question: ${query}\n\nIdeas:\n${ideaList || '(no ideas captured yet)'}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { text: raw, matchIds: [] };
    }

    res.status(200).json({
      text: typeof parsed.text === 'string' ? parsed.text : 'Here is what I found.',
      matchIds: Array.isArray(parsed.matchIds) ? parsed.matchIds.slice(0, 5) : [],
    });
  } catch (err) {
    console.error('assistant error', err);
    res.status(502).json({ error: 'Assistant request failed' });
  }
}
