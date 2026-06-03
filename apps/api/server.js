const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const uploadDir = path.join(__dirname, 'uploads');
const dbPath = path.join(__dirname, 'db.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ items: [], credits: 20 }, null, 2));

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(uploadDir));

const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
const publicUrl = (file) => `${process.env.PUBLIC_BASE_URL}/uploads/${file}`;

async function txt2img(prompt) {
  const res = await axios.post(`${process.env.A1111_BASE_URL}/sdapi/v1/txt2img`, {
    prompt,
    negative_prompt: 'blurry, low quality, distorted',
    steps: 25,
    width: 768,
    height: 1024,
    sampler_name: 'DPM++ 2M Karras'
  });
  const image = res.data.images[0];
  const filename = `${uuidv4()}.png`;
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(image, 'base64'));
  return { filename, url: publicUrl(filename), type: 'image' };
}

async function img2video(imageUrl, prompt) {
  const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBase64 = Buffer.from(imageResp.data).toString('base64');
  const res = await axios.post(`${process.env.A1111_BASE_URL}/sdapi/v1/animateiff/text2video`, {
    prompt: prompt || 'cinematic motion, high detail',
    init_images: [imageBase64],
    video_length: 16,
    fps: 8,
    format: 'mp4'
  });
  const video = res.data.video || res.data.mp4;
  const filename = `${uuidv4()}.mp4`;
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(video, 'base64'));
  return { filename, url: publicUrl(filename), type: 'video' };
}

async function text2video(prompt) {
  const version = process.env.REPLICATE_TEXT_TO_VIDEO_MODEL;
  const response = await axios.post('https://api.replicate.com/v1/predictions', {
    version,
    input: { prompt }
  }, {
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  let prediction = response.data;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    prediction = poll.data;
  }

  if (prediction.status !== 'succeeded') throw new Error('Text to video failed');
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  const videoResp = await axios.get(outputUrl, { responseType: 'arraybuffer' });
  const filename = `${uuidv4()}.mp4`;
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(videoResp.data));
  return { filename, url: publicUrl(filename), type: 'video' };
}

function consumeCredits(cost) {
  const db = readDb();
  if (db.credits < cost) throw new Error('Not enough credits');
  db.credits -= cost;
  writeDb(db);
}

function saveItem(item) {
  const db = readDb();
  db.items.unshift({ id: uuidv4(), createdAt: new Date().toISOString(), ...item });
  writeDb(db);
  return db.items[0];
}

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/api/gallery', (_, res) => res.json(readDb().items));
app.get('/api/credits', (_, res) => res.json({ credits: readDb().credits }));

app.post('/api/generate/image', async (req, res) => {
  try {
    consumeCredits(1);
    const result = await txt2img(req.body.prompt);
    const item = saveItem({ prompt: req.body.prompt, ...result });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/image-to-video', async (req, res) => {
  try {
    consumeCredits(2);
    const result = await img2video(req.body.imageUrl, req.body.prompt);
    const item = saveItem({ prompt: req.body.prompt || 'image-to-video', sourceUrl: req.body.imageUrl, ...result });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate/text-to-video', async (req, res) => {
  try {
    consumeCredits(3);
    const result = await text2video(req.body.prompt);
    const item = saveItem({ prompt: req.body.prompt, ...result });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`API on ${PORT}`));
