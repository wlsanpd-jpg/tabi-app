// TABI — 경량 이벤트 애널리틱스
// Vercel 로그에 기록. 추후 DB / GA4로 확장 가능.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { event, data = {}, ts, ua } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });

    // IP 익명화 (마지막 옥텟 제거)
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';
    const anonIp = rawIp.replace(/\.\d+$/, '.0');

    // 구조화 로그 (Vercel 대시보드에서 조회 가능)
    console.log(JSON.stringify({
      type: 'TABI_EVENT',
      event,
      data,
      ts: ts || Date.now(),
      ip: anonIp,
      ua: (ua || '').slice(0, 120)
    }));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).end();
  }
}
