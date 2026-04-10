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

  // 스타일별 구체적 지침
  const styleGuide = {
    '가성비': '무료 명소 위주, 저렴한 현지 식당(라멘·우동·편의점), 100엔샵, 대중교통 이용. 1인 하루 8,000엔 이하 목표.',
    '럭셔리': '미슐랭 레스토랑, 고급 료칸·호텔, 특별 체험(다도·요리 클래스), 택시 이동. 예산 무제한.',
    '역사문화': '사찰·신사·박물관·성·전통 거리 중심. 역사적 배경 설명 포함.',
  }[style] || '관광명소와 현지 맛집을 균형있게 포함.';

  // 동행별 구체적 지침
  const peopleGuide = {
    '혼자': '혼밥 가능한 식당, 1인 입장 가능한 액티비티, 안전하고 접근성 좋은 장소 우선.',
    '커플': '로맨틱한 카페·야경 포인트·포토존, 커플 메뉴 있는 식당 포함.',
    '가족': '어린이 동반 가능한 곳, 이동 거리 짧게, 공원·놀이시설·패밀리 레스토랑 포함.',
    '단체': '단체 입장 가능, 넓은 공간, 그룹 식사 가능한 식당 우선.',
  }[people] || '';

  // 예시 2일 구조로 Claude가 형식을 명확히 이해하도록
  const formatExample = JSON.stringify({
    days: [
      {
        label: "Day 1 테마명",
        places: [
          { name: "장소A", time: "09:00", tip: "꿀팁 내용" },
          { name: "장소B", time: "11:30", tip: "꿀팁 내용" }
        ]
      },
      {
        label: "Day 2 테마명",
        places: [
          { name: "장소C", time: "09:00", tip: "꿀팁 내용" },
          { name: "장소D", time: "11:30", tip: "꿀팁 내용" }
        ]
      }
    ]
  });

  const systemPrompt = '당신은 일본 현지 사정을 잘 아는 여행 전문가입니다. 반드시 순수 JSON만 출력하고, 마크다운 코드블록이나 설명 텍스트를 절대 포함하지 마세요.';

  const userPrompt = [
    `${city} ${days}박 ${total}일 여행 일정을 JSON으로 작성하세요.`,
    '',
    `[여행 조건]`,
    `- 도시: ${city}`,
    `- 기간: ${days}박 ${total}일 (day 객체 반드시 ${total}개)`,
    `- 스타일: ${style || '자유여행'} → ${styleGuide}`,
    `- 동행: ${people || '혼자'} → ${peopleGuide}`,
    `- 관심사: ${interestStr}`,
    '',
    `[필수 규칙]`,
    `1. days 배열에 정확히 ${total}개의 day 객체를 포함할 것`,
    `2. 각 day마다 서로 다른 장소 4~6개 — 절대 같은 장소를 여러 day에 중복 사용 금지`,
    `3. Day 1은 시내 중심 명소, Day 2는 다른 지역/테마, Day 3 이후는 근교 또는 쇼핑/체험 위주로 구성`,
    `4. 동선을 고려해 같은 날 방문 장소는 지리적으로 가까운 곳끼리 묶기`,
    `5. label: 그날의 테마를 한국어로 (예: "전통 사찰과 골목 탐방")`,
    `6. time: "HH:MM" 24시간 형식`,
    `7. tip: 그 장소만의 실용적 현지 팁 1~2문장 (입장료·예약·교통·주의사항 등)`,
    `8. 장소명은 한국어 표기 (일본 현지명 기준)`,
    '',
    `[출력 형식] — 순수 JSON 오브젝트만, 다른 텍스트 없음:`,
    formatExample
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        temperature: 0.8,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
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

    // days 수가 맞는지 검증 (로그용)
    if (days_result.length !== total) {
      console.warn(`Expected ${total} days, got ${days_result.length}`);
    }

    // 캐시 방지 (매번 새 일정)
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ days: days_result, model: data.model, usage: data.usage });

  } catch (err) {
    console.error('Itinerary generation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
