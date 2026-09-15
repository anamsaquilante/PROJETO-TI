const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5050);
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'monitoramento.json');
const BACKUP_FILE = path.join(DATA_DIR, 'monitoramento.json.bak');
const MAX_BODY = 5 * 1024 * 1024;

const DEFAULT_DATA = { notebooks: [], suporte: [], alunos: [] };
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function validData(value) {
  return value && typeof value === 'object'
    && Array.isArray(value.notebooks)
    && Array.isArray(value.suporte)
    && Array.isArray(value.alunos);
}

function loadData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) return structuredClone(DEFAULT_DATA);
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!validData(parsed)) throw new Error('Formato inválido em ' + DATA_FILE);
  return parsed;
}

function saveData(value) {
  if (!validData(value)) throw new Error('Payload de dados inválido');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = DATA_FILE + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' });
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  fs.renameSync(temp, DATA_FILE);
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload muito grande'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function safePublicPath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const full = path.resolve(PUBLIC_DIR, '.' + decodeURIComponent(requested));
  return full.startsWith(path.resolve(PUBLIC_DIR) + path.sep) ? full : null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, port: PORT });
    }

    if (url.pathname === '/api/data' && req.method === 'GET') {
      return sendJson(res, 200, loadData());
    }

    if (url.pathname === '/api/data' && req.method === 'POST') {
      const value = JSON.parse(await readBody(req));
      saveData(value);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'Método não permitido' });
    }

    const file = safePublicPath(url.pathname);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return sendJson(res, 404, { error: 'Recurso não encontrado' });
    }
    const content = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(content);
  } catch (error) {
    console.error(new Date().toISOString(), error.stack || error.message);
    sendJson(res, error.statusCode || 500, { error: 'Erro interno do servidor' });
  }
});

process.on('uncaughtException', error => console.error(new Date().toISOString(), 'uncaughtException', error));
process.on('unhandledRejection', error => console.error(new Date().toISOString(), 'unhandledRejection', error));

loadData();
server.listen(PORT, HOST, () => {
  console.log(`Monitoramento ouvindo em http://${HOST}:${PORT}`);
  console.log(`Dados persistidos em ${DATA_FILE}`);
});
