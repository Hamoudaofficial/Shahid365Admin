// ═══════════════════════════════════════════════════════════════════════════════
//  SHAHID365 — Production API Server
//  Render.com | Node.js 18+
//  MongoDB: cluster0.foexx4q.mongodb.net
// ═══════════════════════════════════════════════════════════════════════════════
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const axios    = require('axios');

const app = express();

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT        || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hamoudaofficial3:T9%40xQ%234mL!2vZ%247pR@cluster0.foexx4q.mongodb.net/shahid365?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET  = process.env.JWT_SECRET  || 'shahid365SuperSecret2026!@#';
const ADMIN_USER  = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'T9@xQ#4mL!2vZ$7pR';
const TMDB_KEY    = process.env.TMDB_API_KEY   || '6235c6c495feb99e4f3d9f5681a02db5';
const TMDB_TOKEN  = process.env.TMDB_READ_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2MjM1YzZjNDk1ZmViOTllNGYzZDlmNTY4MWEwMmRiNSIsIm5iZiI6MTc3NjM1MzIwNC43MDQsInN1YiI6IjY5ZTBmZmI0OWU3ODNlMjVhYTJkOWU5MyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.mydo5EJD10telwl1dfsv8-_ja1j5ocLkrgvCaVaNCdI';

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://shahid365.vercel.app',
  'https://shahid365-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null', // file:// protocol for local testing
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, true); // allow all during development; tighten in prod
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
  .then(() => console.log('✅ MongoDB Atlas connected — shahid365'))
  .catch(e  => { console.error('❌ MongoDB:', e.message); process.exit(1); });

// ═══════════════════════════════════════════════════════════════════════════════
//  MONGOOSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Person ────────────────────────────────────────────────────────────────────
const PersonSchema = new mongoose.Schema({
  name:   { type: String, required: true, trim: true },
  nameAr: { type: String, trim: true },
  photo:  String,
  bio:    String,
  bioAr:  String,
  tmdbId: { type: Number, sparse: true },
}, { timestamps: true });
PersonSchema.index({ name: 1 });
PersonSchema.index({ nameAr: 1 });
const Person = mongoose.models.Person || mongoose.model('Person', PersonSchema);

// ── Movie / Series ────────────────────────────────────────────────────────────
const MovieSchema = new mongoose.Schema({
  type:      { type: String, enum: ['movie','series'], required: true },
  title:     { type: String, required: true, trim: true },
  titleAr:   { type: String, trim: true },
  origTitle: String,
  desc:      String,
  descAr:    String,
  poster:    String,
  backdrop:  String,
  year:      Number,
  duration:  Number,
  rating:    Number,
  lang:      { type: String, default: 'ar' },
  genres:    [String],
  genresAr:  [String],
  director:  { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  cast: [{
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    role:   String,
    roleAr: String,
    _id: false,
  }],
  videoUrl:   String,
  dlUrl:      String,
  trailerUrl: String,
  featured:   { type: Boolean, default: false },
  views:      { type: Number, default: 0 },
  tmdbId:     { type: Number, sparse: true },
  imdbId:     { type: String, sparse: true },
}, { timestamps: true });

MovieSchema.index({ type: 1, featured: -1, createdAt: -1 });
MovieSchema.index({ type: 1, rating: -1 });
MovieSchema.index({ type: 1, year: -1 });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ 'cast.person': 1 });
MovieSchema.index({ director: 1 });
MovieSchema.index({ title: 'text', titleAr: 'text', desc: 'text' }, { default_language: 'none' });
const Movie = mongoose.models.Movie || mongoose.model('Movie', MovieSchema);

// ── Season ────────────────────────────────────────────────────────────────────
const SeasonSchema = new mongoose.Schema({
  movie:   { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  n:       { type: Number, required: true },
  title:   String,
  titleAr: String,
  poster:  String,
}, { timestamps: true });
SeasonSchema.index({ movie: 1, n: 1 }, { unique: true });
const Season = mongoose.models.Season || mongoose.model('Season', SeasonSchema);

// ── Episode ───────────────────────────────────────────────────────────────────
const EpisodeSchema = new mongoose.Schema({
  season:      { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
  movie:       { type: mongoose.Schema.Types.ObjectId, ref: 'Movie',  required: true },
  n:           { type: Number, required: true },
  title:       String,
  titleAr:     String,
  desc:        String,
  descAr:      String,
  thumb:       String,
  videoUrl:    String,
  dlUrl:       String,
  duration:    Number,
  releaseDate: { type: Date, index: true },
}, { timestamps: true });
EpisodeSchema.index({ season: 1, n: 1 }, { unique: true });
EpisodeSchema.index({ movie: 1, releaseDate: 1 });
const Episode = mongoose.models.Episode || mongoose.model('Episode', EpisodeSchema);

// ── Channel ───────────────────────────────────────────────────────────────────
const ChannelSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  nameAr: String,
  logo:   String,
  stream: { type: String, required: true },
  cat:    String,
  catAr:  String,
  active: { type: Boolean, default: true },
  order:  { type: Number, default: 0 },
}, { timestamps: true });
ChannelSchema.index({ active: 1, order: 1 });
const Channel = mongoose.models.Channel || mongoose.model('Channel', ChannelSchema);

// ── Ad ────────────────────────────────────────────────────────────────────────
const AdSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  adType:     { type: String, enum: ['banner','preroll','interstitial'], required: true },
  position:   { type: String, enum: ['home','movie','series','live','all'], default: 'all' },
  imageUrl:   String,
  videoUrl:   String,
  linkUrl:    { type: String, required: true },
  active:     { type: Boolean, default: true },
  delayMs:    { type: Number, default: 3000 },
  skipAfter:  { type: Number, default: 5 },
  bannerSecs: { type: Number, default: 8 },
  everyN:     { type: Number, default: 4 },
  maxPerSess: { type: Number, default: 2 },
  impr:       { type: Number, default: 0 },
  clicks:     { type: Number, default: 0 },
}, { timestamps: true });
AdSchema.index({ active: 1, position: 1 });
const Ad = mongoose.models.Ad || mongoose.model('Ad', AdSchema);

// ── Subscription ──────────────────────────────────────────────────────────────
const SubSchema = new mongoose.Schema({
  code:   { type: String, required: true, unique: true, uppercase: true, trim: true },
  label:  { type: String, default: '' },
  maxDev: { type: Number, default: 1, min: 1, max: 50 },
  devices: [{
    fp:   { type: String, required: true },
    ua:   String,
    reg:  { type: Date, default: Date.now },
    seen: { type: Date, default: Date.now },
    _id:  false,
  }],
  active:    { type: Boolean, default: true },
  expiresAt: { type: Date, sparse: true },
}, { timestamps: true });
const Sub = mongoose.models.Subscription || mongoose.model('Subscription', SubSchema);

// ── Settings ──────────────────────────────────────────────────────────────────
const SettingsSchema = new mongoose.Schema({
  heroIds:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  maintenance: {
    on:    { type: Boolean, default: false },
    msg:   { type: String, default: 'We are upgrading the platform. Back soon.' },
    msgAr: { type: String, default: 'نقوم بتحديث المنصة. سنعود قريباً.' },
  },
  subRequired:  { type: Boolean, default: false },
  adsEnabled:   { type: Boolean, default: true },
  tmdbKey:      String,
  siteTitle:    { type: String, default: 'Shahid365' },
  siteTitleAr:  { type: String, default: 'شاهد 365' },
}, { timestamps: true });
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/',          (_, res) => res.json({ service: 'Shahid365 API', status: 'running', ts: new Date() }));
app.get('/api/health',(_, res) => res.json({ ok: true, ts: new Date() }));

// ── Auth Login ────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const validUser = ADMIN_USER;
  const validPass = decodeURIComponent(ADMIN_PASS); // handles URL-encoded password

  if (username !== validUser || (password !== validPass && password !== ADMIN_PASS)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const token = jwt.sign({ role: 'admin', user: username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: username });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    let s = await Settings.findOne()
      .populate('heroIds', 'title titleAr poster backdrop type year rating')
      .lean();
    if (!s) {
      s = await Settings.create({});
      s = s.toObject();
    }
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = new Settings({});
    const { tmdbKey, siteTitle, siteTitleAr, heroIds, maintenance, subRequired, adsEnabled } = req.body;
    if (tmdbKey !== undefined)    s.tmdbKey    = tmdbKey;
    if (siteTitle !== undefined)  s.siteTitle  = siteTitle;
    if (siteTitleAr !== undefined)s.siteTitleAr= siteTitleAr;
    if (heroIds !== undefined)    s.heroIds    = heroIds;
    if (maintenance !== undefined)s.maintenance= { ...s.maintenance, ...maintenance };
    if (subRequired !== undefined)s.subRequired= subRequired;
    if (adsEnabled !== undefined) s.adsEnabled = adsEnabled;
    await s.save();
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stats (Admin Dashboard) ───────────────────────────────────────────────────
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [movies, series, channels, viewsAgg, subs, topContent] = await Promise.all([
      Movie.countDocuments({ type: 'movie' }),
      Movie.countDocuments({ type: 'series' }),
      Channel.countDocuments(),
      Movie.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Sub.countDocuments({ active: true }),
      Movie.find({}).sort({ views: -1 }).limit(8)
        .select('title titleAr poster type year rating views').lean(),
    ]);
    res.json({
      movies, series, channels,
      views: viewsAgg[0]?.total || 0,
      subs,
      topContent,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Movies / Series ───────────────────────────────────────────────────────────
app.get('/api/movies', async (req, res) => {
  try {
    const { type, featured, genre, year, rating, lang, sort = '-createdAt', page = 1, limit = 24, q } = req.query;
    const filter = {};
    if (type)              filter.type    = type;
    if (featured === 'true') filter.featured = true;
    if (genre)             filter.genres  = genre;
    if (year)              filter.year    = +year;
    if (rating)            filter.rating  = { $gte: +rating };
    if (lang)              filter.lang    = lang;
    if (q) {
      filter.$or = [
        { title:   { $regex: q, $options: 'i' } },
        { titleAr: { $regex: q, $options: 'i' } },
        { desc:    { $regex: q, $options: 'i' } },
      ];
    }
    const lim = Math.min(+limit, 100);
    const skip = (+page - 1) * lim;
    const [items, total] = await Promise.all([
      Movie.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(lim)
        .populate('cast.person', 'name nameAr photo')
        .populate('director', 'name nameAr photo')
        .lean(),
      Movie.countDocuments(filter),
    ]);
    res.json({ items, total, page: +page, pages: Math.ceil(total / lim) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/movies/:id', async (req, res) => {
  try {
    const m = await Movie.findById(req.params.id)
      .populate('cast.person', 'name nameAr photo bio bioAr')
      .populate('director', 'name nameAr photo bio')
      .lean();
    if (!m) return res.status(404).json({ error: 'Not found' });
    // Increment views async (don't await)
    Movie.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/movies', authMiddleware, async (req, res) => {
  try {
    const m = await Movie.create(req.body);
    res.status(201).json(m);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const m = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const seasons = await Season.find({ movie: req.params.id }, '_id').lean();
    for (const s of seasons) await Episode.deleteMany({ season: s._id });
    await Season.deleteMany({ movie: req.params.id });
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Seasons ───────────────────────────────────────────────────────────────────
app.get('/api/movies/:id/seasons', async (req, res) => {
  try {
    const seasons = await Season.find({ movie: req.params.id }).sort({ n: 1 }).lean();
    for (const s of seasons) {
      s.epCount = await Episode.countDocuments({ season: s._id });
    }
    res.json(seasons);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/movies/:id/seasons', authMiddleware, async (req, res) => {
  try {
    const s = await Season.create({ ...req.body, movie: req.params.id });
    res.status(201).json(s);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/seasons/:id', authMiddleware, async (req, res) => {
  try {
    const s = await Season.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/seasons/:id', authMiddleware, async (req, res) => {
  try {
    await Episode.deleteMany({ season: req.params.id });
    await Season.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Episodes ──────────────────────────────────────────────────────────────────
app.get('/api/episodes/today', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tom   = new Date(today); tom.setDate(tom.getDate() + 1);
    const eps   = await Episode.find({ releaseDate: { $gte: today, $lt: tom } })
      .populate('movie', 'title titleAr poster type')
      .sort({ releaseDate: 1 })
      .lean();
    res.json(eps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/seasons/:id/episodes', async (req, res) => {
  try {
    const eps = await Episode.find({ season: req.params.id }).sort({ n: 1 }).lean();
    res.json(eps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/seasons/:id/episodes', authMiddleware, async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) return res.status(404).json({ error: 'Season not found' });
    const ep = await Episode.create({ ...req.body, season: req.params.id, movie: season.movie });
    res.status(201).json(ep);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/episodes/:id', authMiddleware, async (req, res) => {
  try {
    const ep = await Episode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ep) return res.status(404).json({ error: 'Not found' });
    res.json(ep);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/episodes/:id', authMiddleware, async (req, res) => {
  try {
    await Episode.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Channels ──────────────────────────────────────────────────────────────────
app.get('/api/channels', async (req, res) => {
  try {
    const filter = {};
    if (req.query.cat)           filter.cat    = req.query.cat;
    if (req.query.active==='true') filter.active = true;
    const channels = await Channel.find(filter).sort({ order: 1, createdAt: -1 }).lean();
    res.json(channels);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/channels', authMiddleware, async (req, res) => {
  try { res.status(201).json(await Channel.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/channels/:id', authMiddleware, async (req, res) => {
  try {
    const c = await Channel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/channels/:id', authMiddleware, async (req, res) => {
  try { await Channel.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Persons ───────────────────────────────────────────────────────────────────
app.get('/api/persons', async (req, res) => {
  try {
    const filter = req.query.q
      ? { $or: [{ name: { $regex: req.query.q, $options: 'i' } }, { nameAr: { $regex: req.query.q, $options: 'i' } }] }
      : {};
    const persons = await Person.find(filter).limit(80).lean();
    res.json(persons);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/persons/:id', async (req, res) => {
  try {
    const p = await Person.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    const works = await Movie.find({
      $or: [{ 'cast.person': p._id }, { director: p._id }],
    }).select('title titleAr poster type year rating').lean();
    res.json({ ...p, works });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/persons', authMiddleware, async (req, res) => {
  try {
    // Upsert by name to avoid duplicates
    const { name, nameAr, photo, bio, bioAr, tmdbId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const p = await Person.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, nameAr: nameAr||'', photo: photo||'', bio: bio||'', bioAr: bioAr||'', tmdbId } },
      { upsert: true, new: true }
    );
    res.status(201).json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/persons/:id', authMiddleware, async (req, res) => {
  try {
    const p = await Person.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/persons/:id', authMiddleware, async (req, res) => {
  try { await Person.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TMDB Proxy ────────────────────────────────────────────────────────────────
app.get('/api/tmdb/search', authMiddleware, async (req, res) => {
  try {
    const { q, lang = 'ar' } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const tl  = lang === 'ar' ? 'ar-SA' : 'en-US';
    const key = TMDB_KEY;
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${key}&query=${encodeURIComponent(q)}&language=${tl}&include_adult=false&page=1`;
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    const results = (data.results || [])
      .filter(r => ['movie','tv'].includes(r.media_type))
      .slice(0, 12)
      .map(r => ({
        tmdbId:    r.id,
        mediaType: r.media_type,
        title:     r.title || r.name || '',
        year:      (r.release_date || r.first_air_date || '').split('-')[0],
        poster:    r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null,
        rating:    r.vote_average ? +r.vote_average.toFixed(1) : null,
        overview:  r.overview || '',
      }));
    res.json(results);
  } catch (e) {
    console.error('TMDB search error:', e.message);
    res.status(500).json({ error: 'TMDB error: ' + e.message });
  }
});

app.get('/api/tmdb/details/:tmdbId', authMiddleware, async (req, res) => {
  try {
    const { mediaType = 'movie', lang = 'ar' } = req.query;
    const tl   = lang === 'ar' ? 'ar-SA' : 'en-US';
    const mtype = mediaType === 'tv' ? 'tv' : 'movie';
    const key  = TMDB_KEY;
    const url  = `https://api.themoviedb.org/3/${mtype}/${req.params.tmdbId}?api_key=${key}&language=${tl}&append_to_response=credits,videos`;
    const { data: d } = await axios.get(url, {
      timeout: 10000,
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    const trailer    = (d.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const directorC  = (d.credits?.crew   || []).find(c => c.job === 'Director');
    res.json({
      tmdbId:         d.id,
      mediaType:      mtype,
      title:          d.title    || d.name    || '',
      origTitle:      d.original_title || d.original_name || '',
      desc:           d.overview || '',
      poster:         d.poster_path   ? `https://image.tmdb.org/t/p/w500${d.poster_path}`   : null,
      backdrop:       d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
      year:           parseInt((d.release_date || d.first_air_date || '').split('-')[0]) || null,
      duration:       d.runtime || d.episode_run_time?.[0] || null,
      rating:         d.vote_average ? +d.vote_average.toFixed(1) : null,
      lang:           d.original_language || 'ar',
      genres:         (d.genres || []).map(g => g.name),
      trailerUrl:     trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
      directorName:   directorC?.name || null,
      directorTmdbId: directorC?.id   || null,
      cast: (d.credits?.cast || []).slice(0, 15).map(c => ({
        name:    c.name || '',
        nameAr:  '',
        tmdbId:  c.id,
        photo:   c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null,
        role:    c.character || '',
      })),
    });
  } catch (e) {
    console.error('TMDB details error:', e.message);
    res.status(500).json({ error: 'TMDB error: ' + e.message });
  }
});

// ── Ads ───────────────────────────────────────────────────────────────────────
app.get('/api/ads', async (req, res) => {
  try {
    if (req.query.admin === '1') {
      return res.json(await Ad.find().sort({ createdAt: -1 }).lean());
    }
    const filter = { active: true };
    if (req.query.position) {
      filter.$or = [{ position: req.query.position }, { position: 'all' }];
    }
    res.json(await Ad.find(filter).lean());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ads', authMiddleware, async (req, res) => {
  try { res.status(201).json(await Ad.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/ads/:id', authMiddleware, async (req, res) => {
  try {
    const a = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/ads/:id', authMiddleware, async (req, res) => {
  try { await Ad.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/ads/:id/track', async (req, res) => {
  try {
    const field = req.body?.event === 'click' ? 'clicks' : 'impr';
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { [field]: 1 } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Subscriptions ─────────────────────────────────────────────────────────────
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    res.json(await Sub.find().sort({ createdAt: -1 }).lean());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/subscriptions/verify', async (req, res) => {
  try {
    const { code, fp, ua = '' } = req.body || {};
    if (!code || !fp) return res.status(400).json({ error: 'Missing data' });
    const sub = await Sub.findOne({ code: code.toUpperCase().trim() });
    if (!sub)        return res.status(404).json({ error: 'كود غير صحيح' });
    if (!sub.active) return res.status(403).json({ error: 'الاشتراك غير نشط' });
    if (sub.expiresAt && sub.expiresAt < new Date())
      return res.status(403).json({ error: 'انتهت صلاحية الاشتراك' });

    const existing = sub.devices.find(d => d.fp === fp);
    if (existing) {
      await Sub.updateOne(
        { _id: sub._id, 'devices.fp': fp },
        { $set: { 'devices.$.seen': new Date(), 'devices.$.ua': ua } }
      );
      return res.json({ ok: true, message: 'مرحباً بعودتك' });
    }
    if (sub.devices.length >= sub.maxDev) {
      return res.status(403).json({ error: `تم تجاوز حد الأجهزة (${sub.maxDev})`, maxDevices: sub.maxDev });
    }
    await Sub.updateOne(
      { _id: sub._id },
      { $push: { devices: { fp, ua, reg: new Date(), seen: new Date() } } }
    );
    res.json({ ok: true, registered: true, message: 'تم تسجيل جهازك' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { label = '', maxDev = 1, expiresAt } = req.body;
    const a    = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b    = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `SHAH-${a}-${b}`;
    const sub  = await Sub.create({
      code,
      label,
      maxDev: Math.min(50, Math.max(1, +maxDev)),
      expiresAt: expiresAt || undefined,
    });
    res.status(201).json(sub);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/subscriptions/:id', authMiddleware, async (req, res) => {
  try {
    const s = await Sub.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/subscriptions/:id', authMiddleware, async (req, res) => {
  try { await Sub.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shahid365 API running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${ALLOWED_ORIGINS.filter(o => o !== 'null').join(', ')}`);
});
