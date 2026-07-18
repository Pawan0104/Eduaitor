import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function run() {
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'school@admin.com', password: '#admin@school123' }),
    });

    const loginJson = await loginRes.json();
    if (!loginJson.success || !loginJson.token) {
      console.error('Login failed', loginJson);
      process.exit(1);
    }

    const token = loginJson.token;

    const createRes = await fetch(`${BASE}/api/classes/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test Class', details: [{ roomNumber: '101' }] }),
    });

    const createJson = await createRes.json();
    console.log('Create class response:', createJson);
  } catch (err) {
    console.error('Script error:', err);
  }
}

run();
