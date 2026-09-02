const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ================= GitHub 配置 =================
// token 优先级: 环境变量 > 本地 .env 文件(Render 用环境变量, 本地可用 .env)
let _token = process.env.GITHUB_TOKEN;
if (!_token) {
  try {
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      const m = fs.readFileSync(envFile, 'utf-8').match(/GITHUB_TOKEN\s*=\s*"?([A-Za-z0-9_\-]+)"?/);
      if (m) _token = m[1].trim();
    }
  } catch(e) {}
}
const GITHUB_TOKEN = _token;

const GITHUB_OWNER = 'Jay-Guanjie';
const GITHUB_REPO = 'yue-du-zhang-ben';
const https = require('https');
const IS_RENDER = !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;

let cache = null;               // 当前内存中的权威数据
let cacheSha = null;            // 上一次读取/写入时的 GitHub 文件 sha（用于乐观锁）
let saveChain = Promise.resolve(); // 保存操作互斥锁（串行化内存读-改，避免并发覆盖）

function githubApi(method, path2, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'yue-du-zhang-ben',
      'Content-Type': 'application/json',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path2}`,
      method,
      headers,
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ================= 初始模板（仅当完全没有本地缓存时） =================
function buildInitialData() {
  const initialData = { password: '888888', months: {} };
  const months = [
    '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
    '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
    '2026-10', '2026-11', '2026-12', '2027-01'
  ];
  months.forEach(m => {
    initialData.months[m] = {
      bankAccounts: {
        '余额宝': 0, '零钱通': 0, '现金': 0, '招行': 0,
        '建行': 0, '工行': 0, '中信-C': 0, '中信-Q': 0,
        '北京银行': 0, '民生银行': 0, '中行': 0, '光大': 0, '农行': 0
      },
      licai: {}, funds: {},
      receivables: 0,
      debts: {
        '欠款-花呗': 0, '欠款-中行': 0, '欠款-建行': 0,
        '欠款-招行Q': 0, '欠款-招行C': 0, '欠款-工行': 0, '欠款-北行': 0
      },
      income: {}, expenses: {}
    };
  });
  return initialData;
}

// 读取权威数据：GitHub > 本地缓存 > 初始模板
async function readData() {
  if (cache) return cache;

  // 优先从 GitHub 拉取（唯一真相源），带重试应对弱网 TLS 断连
  let fetched = null;
  if (GITHUB_TOKEN) {
    for (let attempt = 0; attempt < 3 && !fetched; attempt++) {
      try {
        const existing = await githubApi('GET', '/contents/data.json');
        if (existing && existing.content) {
          const buf = Buffer.from(existing.content, 'base64').toString('utf-8');
          fetched = JSON.parse(buf);
          cacheSha = existing.sha;
        }
      } catch(e) {
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        else console.error('[启动] 从 GitHub 拉取失败:', e.message);
      }
    }
  }

  if (fetched) {
    cache = fetched;
    // 同步一份到本地缓存（方便离线/查错）
    try { saveLocalCache(fetched); } catch(e) {}
    console.log(`[启动] 已从 GitHub 加载权威数据（sha=${(cacheSha||'').slice(0,10)}）`);
    return cache;
  }

  // GitHub 不可用 → 本地缓存兜底
  if (fs.existsSync(DATA_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      console.log('[启动] GitHub 不可用，使用本地缓存数据');
      return cache;
    } catch(e) { console.error('[启动] 本地缓存损坏:', e.message); }
  }

  // 都没有 → 初始模板
  cache = buildInitialData();
  try { saveLocalCache(cache); } catch(e) {}
  console.log('[启动] 无可用数据，使用初始模板');
  return cache;
}

function saveLocalCache(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 推送数据到 GitHub（写穿透）。带重试与乐观锁。
async function pushOnce() {
  const data = cache || (await readData());
  const payload = { password: data.password, months: data.months };
  const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');

  // 拿最新 sha（乐观锁：避免覆盖外部最新提交）
  let sha = cacheSha;
  try {
    const existing = await githubApi('GET', '/contents/data.json');
    if (existing && existing.sha) sha = existing.sha;
    else if (existing && existing.message === 'Not Found') sha = null;
  } catch(e) {}

  const result = await githubApi('PUT', '/contents/data.json', {
    message: `同步数据 - ${new Date().toISOString().slice(0,10)}`,
    content, sha: sha || undefined, branch: 'main'
  });

  if (result && result.content) {
    cacheSha = result.content.sha;
    try { saveLocalCache(cache); } catch(e) {}
    return { ok: true };
  }
  return { ok: false, msg: result.message || JSON.stringify(result).slice(0,200) };
}

async function pushToGithub(dataOverride) {
  if (!GITHUB_TOKEN) return { ok: false, msg: '未配置 GITHUB_TOKEN' };
  if (dataOverride) cache = dataOverride;
  const maxAttempts = 3;
  let lastErr = '';
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const r = await pushOnce();
      if (r.ok) return r;
      lastErr = r.msg;
    } catch(e) { lastErr = e.message; }
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1))); // 退避重试
  }
  return { ok: false, msg: `推送失败: ${lastErr}` };
}

// 串行化推送队列：每个保存入队一个「快照」，严格按序推送。
// 快照隔离了共享引用，前一个推送不会被后续保存污染。
let persistChain = Promise.resolve();
function commitData(data) {
  const snapshot = JSON.stringify({ password: data.password, months: data.months });
  try { saveLocalCache(data); } catch(e) {}
  if (!GITHUB_TOKEN) { console.log('[同步] 未配置 token，仅本地保存'); return; }
  persistChain = persistChain.then(async () => {
    const r = await pushSnapshot(snapshot);
    if (r.ok) console.log('[同步] GitHub 推送成功');
    else console.log('[同步] GitHub 推送失败:', r.msg);
  });
}

async function pushSnapshot(snapshot) {
  const { password, months } = JSON.parse(snapshot);
  const payload = { password, months };
  const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
  // 每次推最新 sha（乐观锁，避免覆盖外部提交）
  let sha = cacheSha;
  try {
    const existing = await githubApi('GET', '/contents/data.json');
    if (existing && existing.sha) sha = existing.sha;
    else if (existing && existing.message === 'Not Found') sha = null;
  } catch(e) {}
  const result = await githubApi('PUT', '/contents/data.json', {
    message: `同步数据 - ${new Date().toISOString().slice(0,10)}`,
    content, sha: sha || undefined, branch: 'main'
  });
  if (result && result.content) { cacheSha = result.content.sha; return { ok: true }; }
  return { ok: false, msg: result.message || JSON.stringify(result).slice(0,200) };
}

// ================= API 路由 =================
app.post('/api/login', async (req, res) => {
  const data = await readData();
  if (req.body.password === data.password) res.json({ ok: true });
  else res.json({ ok: false });
});

app.post('/api/change-password', async (req, res) => {
  const data = await readData();
  data.password = req.body.newPassword;
  await commitData(data);
  res.json({ ok: true, synced: !!GITHUB_TOKEN });
});

app.get('/api/months', async (req, res) => {
  const data = await readData();
  res.json(Object.keys(data.months).sort());
});

app.get('/api/month/:month', async (req, res) => {
  const data = await readData();
  const m = data.months[req.params.month];
  if (!m) return res.json(null);
  res.json(m);
});

app.post('/api/month/:month', async (req, res) => {
  // 串行化读-改-存(真正的互斥: 锁内同步操作, 避免2个并发请求读到同一引用互相覆盖)
  const run = saveChain.then(async () => {
    // 同步拿缓存最新引用(不 await, 防止让出事件循环导致交错)
    let data = cache;
    if (!data) {
      try {
        if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      } catch(e) {}
      if (!data) {
        await readData();  // 仅首次未加载时异步初始化一次
        data = cache;
      }
    }
    const month = req.params.month;
    if (!data.months[month]) {
      data.months[month] = {
        bankAccounts: {}, licai: {}, funds: {},
        receivables: 0, debts: {}, income: {}, expenses: {}
      };
    }
    const payload = req.body;
    const m = data.months[month];
    // 前端提交完整月数据, 整体覆盖(串行锁保证后一保存基于最新缓存)
    if (payload.bankAccounts) m.bankAccounts = payload.bankAccounts;
    if (payload.licai) m.licai = payload.licai;
    if (payload.funds) m.funds = payload.funds;
    if (payload.receivables !== undefined) m.receivables = payload.receivables;
    if (payload.debts) m.debts = payload.debts;
    if (payload.income) m.income = payload.income;
    if (payload.expenses) m.expenses = payload.expenses;
    commitData(data);
  });
  saveChain = run.catch(() => {});
  await saveChain;
  res.json({ ok: true, synced: !!GITHUB_TOKEN });
});

app.get('/api/export', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/import', async (req, res) => {
  const importData = req.body;
  if (!importData || !importData.months) {
    return res.json({ ok: false, msg: '数据格式错误' });
  }
  const currentData = await readData();
  importData.password = currentData.password;
  await commitData(importData);
  res.json({ ok: true, msg: '数据恢复成功' });
});

app.post('/api/add-month', async (req, res) => {
  const data = await readData();
  const months = Object.keys(data.months).sort();
  const last = months[months.length - 1];
  if (!last) return res.json({ ok: false, msg: '没有基准月份' });
  const [y, m] = last.split('-').map(Number);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const nextMonth = `${nextY}-${String(nextM).padStart(2, '0')}`;
  if (data.months[nextMonth]) {
    return res.json({ ok: false, msg: `${nextMonth} 已存在` });
  }
  const src = data.months[last];
  data.months[nextMonth] = {
    bankAccounts: Object.fromEntries(Object.keys(src.bankAccounts||{}).map(k => [k, 0])),
    licai: Object.fromEntries(Object.keys(src.licai||{}).map(k => [k, 0])),
    funds: Object.fromEntries(Object.keys(src.funds||{}).map(k => [k, 0])),
    receivables: 0,
    debts: Object.fromEntries(Object.keys(src.debts||{}).map(k => [k, 0])),
    income: Object.fromEntries(Object.keys(src.income||{}).map(k => [k, 0])),
    expenses: Object.fromEntries(Object.keys(src.expenses||{}).map(k => [k, 0]))
  };
  await commitData(data);
  res.json({ ok: true, month: nextMonth, synced: !!GITHUB_TOKEN });
});

// 手动/强制同步到 GitHub 的按钮
app.post('/api/sync-online', async (req, res) => {
  const r = await pushToGithub();
  if (r.ok) {
    res.json({ ok: true, msg: '✅ 已同步到线上！Render 自动部署中（约1-2分钟）' });
  } else {
    res.json({ ok: false, msg: r.msg });
  }
});

// 健康检查（Render 用）
app.get('/api/health', (req, res) => res.json({ ok: true, github: !!GITHUB_TOKEN }));

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 月度账本已启动！`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://<本机IP>:${PORT}`);
  console.log(`  线上访问: 通过 Render 分配的 URL`);
  console.log(`📁 数据文件: ${DATA_FILE}`);
  console.log(`☁️  GitHub 同步: ${GITHUB_TOKEN ? '已配置 (唯一真相源=GitHub)' : '未配置 — 数据只存本地/易失磁盘，重启可能丢失！'}`);
  // 启动预热: 提前加载真相源到内存, 保证后续并发保存/读取全是同步串行、无交错
  try { await readData(); } catch(e) { console.error('[启动] 预热失败:', e.message); }
});
