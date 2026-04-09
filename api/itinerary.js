// TABI — Claude AI 일정 생성 프록시
// 환경변수 ANTHROPIC_API_KEY 필요

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { city, days, style, people, interests = [] } = req.body || {};
  if (!city || !days) return res.status(400).json({ error: 'city and days are required' });

  const total = parseInt(days) + 1;
  const interestStr = Array.isArray(interests) && interests.length
    ? interests.join(', ')
    : '전반적 관광';

  const prompt = [
    '당신은 일본 여행 전문 컨설턴트입니다.',
    `다음 조건에 맞는 여행 일정을 JSON으로 작성해주세요.`,
    '',
    `조건:`,
    `- 도시: ${city}`,
    `- 기간: ${days}박 ${total}일`,
    `- 여행 스타일: ${style || '자유여행'}`,
    `- 동행: ${people || '혼자'}`,
    `- 관심사: ${interestStr}`,
    '',
    `규칙:`,
    `- days 배열에 ${total}개의 day 객체`,
    `- 각 day에 4~6개 장소`,
    `- 장소명은 한국어 (일본 현지명 기준)`,
    `- time: "HH:MM" 형식`,
    `- tip: 실용적 꿀팁 1~2문장 (현지인 시각)`,
    `- label: 하루 테마 (예: "전통과 현대의 조화")`,
    `- 동선을 고려하여 가까운 장소끼리 묶기`,
    '',
    `출력: JSON 오브젝트만, 다른 텍스트 없이`,
    `형식: {"days":[{"label":"테마","places":[{"name":"장소명","time":"09:00","tip":"꿀팁"}]}]}`
  ].join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',   // Haiku 4.5
        max_tokens: 3000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      // 사용자에게 의미 있는 메시지 전달
      let userMsg = `Claude API 오류 (${response.status})`;
      if (response.status === 401) userMsg = 'API 키가 유효하지 않습니다. Vercel 환경변수를 확인하세요.';
      if (response.status === 429) userMsg = '요청 한도 초과. 잠시 후 다시 시도하세요.';
      if (response.status === 404) userMsg = '모델을 찾을 수 없습니다.';
      return res.status(502).json({ error: userMsg, status: response.status, detail: errText.slice(0, 200) });
    }

    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join('');

    // JSON 파싱 (코드블록 제거 후)
    let days_result = null;
    try {
      const clean = text.replace(/```json\n?|```/g, '').trim();
      days_result = JSON.parse(clean).days;
    } catch {
      const match = text.match(/\{[\s\S]*"days"[\s\S]*\}/);
      if (match) {
        try { days_result = JSON.parse(match[0]).days; } catch {}
      }
    }

    if (!days_result || !days_result.length) {
      return res.status(422).json({ error: 'Failed to parse itinerary from Claude response', raw: text.slice(0, 300) });
    }

    // 캐시 방지 (매번 새 일정)
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ days: days_result, model: data.model, usage: data.usage });

  } catch (err) {
    console.error('Itinerary generation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
