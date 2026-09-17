import { app, BrowserWindow, shell } from 'electron';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from '../netlify/functions/sources/config.mjs';
import { scrapeSource } from '../netlify/functions/sources/scraper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8765;
let server;

async function startServer() {
  const api = express();
  const dist = path.join(__dirname, '..', 'dist');

  api.get('/api/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const requested = String(req.query.sources || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!q) return res.status(400).json({ error: 'Recherche vide.' });
      const active = SOURCES.filter(s => requested.length === 0 || requested.includes(s.id));
      if (!active.length) return res.status(400).json({ error: 'Aucune source sélectionnée.' });

      const settled = await Promise.allSettled(active.map(source => scrapeSource(source, q)));
      const sources = [];
      let items = [];
      const failures = [];

      settled.forEach((result, index) => {
        const source = active[index];
        if (result.status === 'fulfilled') {
          sources.push({ id: source.id, name: source.name, ok: true, count: result.value.items.length, message: result.value.message });
          items.push(...result.value.items);
        } else {
          const message = result.reason?.name === 'AbortError' ? 'Délai dépassé' : (result.reason?.message || 'Erreur inconnue');
          sources.push({ id: source.id, name: source.name, ok: false, count: 0, message });
          failures.push(`${source.name}: ${message}`);
        }
      });

      items = items
        .filter(x => Number.isFinite(Number(x.total)) && Number(x.total) > 0)
        .sort((a, b) => Number(a.total) - Number(b.total));

      res.json({
        query: q,
        items,
        sources,
        updatedAt: new Date().toISOString(),
        warning: failures.length ? `Certaines sources n'ont pas répondu : ${failures.join(' • ')}` : null
      });
    } catch (error) {
      console.error('Erreur API /api/search:', error);
      res.status(500).json({ error: error?.message || 'Erreur interne.' });
    }
  });

  api.use(express.static(dist));

  // Express 5 / path-to-regexp no longer accepts the old app.get('*') syntax.
  // Use a final middleware for the SPA fallback instead.
  api.use((req, res) => res.sendFile(path.join(dist, 'index.html')));

  await new Promise((resolve, reject) => {
    server = api.listen(PORT, '127.0.0.1', resolve);
    server.on('error', reject);
  });
}

async function createWindow() {
  await startServer();
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  await win.loadURL(`http://127.0.0.1:${PORT}/`);
}

app.whenReady().then(createWindow).catch(error => {
  console.error('PRICE FINDER startup error:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
