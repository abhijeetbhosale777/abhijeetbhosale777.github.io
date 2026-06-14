// ─────────────────────────────────────────────
//  Abhijeet Bhosale — Portfolio Backend Server
//  Stack: Node.js + Express + PostgreSQL (Supabase)
// ─────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// ── 1. Create Express App ─────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// ── 2. Middleware ─────────────────────────────
// CORS → allows your frontend (GitHub Pages) to call this server
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://127.0.0.1:5500',  // local live server
    'http://localhost:5500',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
}));

// Parse incoming JSON body
app.use(express.json());

// ── 3. Database Connection ────────────────────
const db = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false }, // required for Supabase
});

// Test DB connection on startup
db.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database!');
    release();
  }
});

// ── 4. Auto-create table if not exists ───────
async function createTableIfNotExists() {
  const query = `
    CREATE TABLE IF NOT EXISTS contacts (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  try {
    await db.query(query);
    console.log('✅ contacts table is ready!');
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
  }
}
createTableIfNotExists();

// ── 5. ROUTES ─────────────────────────────────

// GET / → Health check (just to confirm server is running)
app.get('/', (req, res) => {
  res.json({
    status:  'running',
    message: 'Abhijeet Bhosale Portfolio Backend is live! 🚀',
    routes: {
      'POST /api/contact' : 'Save a contact form submission',
      'GET  /api/contacts': 'Get all contact submissions',
    }
  });
});

// ─────────────────────────────────────────────
// POST /api/contact
// Called when user submits the contact form
// Body: { name, email, message }
// ─────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  // Validate inputs
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required: name, email, message'
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }

  try {
    // Insert into PostgreSQL
    const result = await db.query(
      `INSERT INTO contacts (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.trim(), message.trim()]
    );

    const saved = result.rows[0];

    console.log(`📩 New contact from: ${saved.name} (${saved.email}) at ${saved.created_at}`);

    res.status(201).json({
      success: true,
      message: 'Message received! Abhijeet will get back to you soon.',
      data: {
        id:         saved.id,
        name:       saved.name,
        email:      saved.email,
        created_at: saved.created_at
      }
    });

  } catch (err) {
    console.error('❌ DB insert error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/contacts
// Get all contact submissions (you can view them)
// ─────────────────────────────────────────────
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, message, created_at
       FROM contacts
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      total:   result.rows.length,
      data:    result.rows
    });

  } catch (err) {
    console.error('❌ DB fetch error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Could not fetch contacts.'
    });
  }
});

// ── 6. 404 Handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

// ── 7. Start Server ───────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Server is running!');
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Health:  http://localhost:${PORT}/`);
  console.log(`👉 Contact: POST http://localhost:${PORT}/api/contact`);
  console.log('');
});