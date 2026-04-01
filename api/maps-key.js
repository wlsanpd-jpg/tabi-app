export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.GOOGLE_PLACES_API_KEY || '';
  res.status(200).json({ key });
}
