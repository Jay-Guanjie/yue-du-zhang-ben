const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// CORS - 允许跨域访问
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// 读取数据
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      password: '888888',
      months: {}
    };
    const months = [
      '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
      '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
      '2026-10', '2026-11', '2026-12'
    ];
    months.forEach(m => {
      initialData.months[m] = {
        bankAccounts: {
          '余额宝': 0, '零钱通': 0, '现金': 0, '招行': 0,
          '建行': 0, '工行': 0, '中信-C': 0, '中信-Q': 0,
          '北京银行': 0, '民生银行': 0, '中行': 0, '光大': 0, '农行': 0
        },
        licai: {},
        funds: {},
        receivables: 0,
        debts: {
          '欠款-花呗': 0, '欠款-中行': 0, '欠款-建行': 0,
          '欠款-招行Q': 0, '欠款-招行C': 0, '欠款-工行': 0, '欠款-北行': 0
        },
        income: {},
        expenses: {}
      };
    });
    initialData.months['2025-12'].bankAccounts = {
      '余额宝': 7.44, '零钱通': 907.23+739.14, '现金': 59, '招行': 2859.28,
      '建行': 844.47, '工行': 3209.54, '中信-C': 154331.32, '中信-Q': 0,
      '北京银行': 0, '民生银行': 18543.23, '中行': 288.37, '光大': 0, '农行': 0
    };
    initialData.months['2026-01'].bankAccounts = {
      '余额宝': 5.80, '零钱通': 59.43+426.91, '现金': 59, '招行': 485.18+4093.70,
      '建行': 47670-10339.21, '工行': 1347.90, '中信-C': 149663.98+12.10, '中信-Q': 0,
      '北京银行': 8594, '民生银行': 18223.61, '中行': 53.79, '光大': 0, '农行': 0
    };
    initialData.months['2026-02'].bankAccounts = {
      '余额宝': 7.58, '零钱通': 84.57+0.89, '现金': 59, '招行': 581.97+44480.46,
      '建行': 14470.36-10339.21, '工行': 0, '中信-C': 8391.39, '中信-Q': 0,
      '北京银行': 8588, '民生银行': 17500.82, '中行': 33.33, '光大': 0, '农行': 0
    };
    initialData.months['2026-03'].bankAccounts = {
      '余额宝': 1480.93, '零钱通': 12480.87+0.19, '现金': 59, '招行': 0,
      '建行': 13433.44-10339.21, '工行': 0, '中信-C': 66196.75, '中信-Q': 493.86,
      '北京银行': 8594, '民生银行': 9004.02, '中行': 22.72, '光大': 0, '农行': 0
    };
    initialData.months['2026-04'].bankAccounts = {
      '余额宝': 1033.60, '零钱通': 2358.85, '现金': 59, '招行': 0,
      '建行': 3160.38, '工行': 20935.69, '中信-C': 101809.13, '中信-Q': 1841.36,
      '北京银行': 8594, '民生银行': 8498.25, '中行': 22.72, '光大': 0, '农行': 0
    };
    initialData.months['2026-05'].bankAccounts = {
      '余额宝': 433.81, '零钱通': 2.15+0.19, '现金': 2059, '招行': 0,
      '建行': 11154.71-10339.21, '工行': 0, '中信-C': 151806.32, '中信-Q': 1996.43,
      '北京银行': 8594, '民生银行': 8054.83, '中行': 22.72, '光大': 0, '农行': 0
    };
    initialData.months['2026-06'].bankAccounts = {
      '余额宝': 23.46, '零钱通': 4.68, '现金': 59, '招行': 0,
      '建行': 591.72, '工行': 505.65, '中信-C': 81573.43-13000*3+7300*3, '中信-Q': 1189.20,
      '北京银行': 8594, '民生银行': 6787.12, '中行': 0, '光大': 0, '农行': 0
    };

    const licaiProducts = {
      '2025-12': { '日盈象': 100490.94, '交银28号': 101731.33, '安盈象14个月': 0, '阳光金10号': 0, '农银理财2号': 0 },
      '2026-01': { '日盈象': 100608.29, '交银28号': 101864.14, '安盈象14个月': 0, '阳光金10号': 0, '农银理财2号': 0 },
      '2026-02': { '日盈象': 100715.96, '交银28号': 101988.98, '安盈象14个月': 0, '阳光金10号': 0, '农银理财2号': 150120.93 },
      '2026-03': { '日盈象': 100832.50, '交银28号': 102132.79, '安盈象14个月': 0, '阳光金10号': 0, '农银理财2号': 150329.85 },
      '2026-04': { '日盈象': 100942.93, '交银28号': 102259.71, '安盈象14个月': 200080, '阳光金10号': 0, '农银理财2号': 150521.40 },
      '2026-05': { '日盈象': 101047.42, '交银28号': 102377.62, '安盈象14个月': 200700, '阳光金10号': 0, '农银理财2号': 150701.98 },
      '2026-06': { '日盈象': 101149.80, '交银28号': 102501.01, '安盈象14个月': 200980, '阳光金10号': 100115.24, '农银理财2号': 150899.94 }
    };
    Object.keys(licaiProducts).forEach(m => {
      if (initialData.months[m]) {
        initialData.months[m].licai = licaiProducts[m];
      }
    });

    const fundProducts = {
      '2025-12': { '巨化股份': 19210, '豫光金铅': 2350, '恒泰reit': 6541.20, '百联reit': 23747.40, '北保reit': 24522, '黄金ETF(中金)': 18602, '国债逆回购': 102096.16, '南网储能': 0, '化工ETF': 0, '黄金ETF(东方)': 0, '电网设备ETF': 0, '易方达现金增利货币B': 100481.68, '易方达国防军工混合': 8249.13, '易方达创业板ETF连接C': 9355.74, '易方达蓝筹精选': 6902.32 },
      '2026-01': { '巨化股份': 15736, '豫光金铅': 0, '恒泰reit': 6847.20, '百联reit': 14120, '北保reit': 24894, '黄金ETF(中金)': 30825, '国债逆回购': 108000, '南网储能': 0, '化工ETF': 0, '黄金ETF(东方)': 0, '电网设备ETF': 0, '易方达现金增利货币B': 100605.54, '易方达国防军工混合': 9230.01, '易方达创业板ETF连接C': 9757.26, '易方达蓝筹精选': 7185.48 },
      '2026-02': { '巨化股份': 0, '豫光金铅': 0, '恒泰reit': 0, '百联reit': 0, '北保reit': 0, '黄金ETF(中金)': 34985.60, '国债逆回购': 354506.99, '南网储能': 0, '化工ETF': 0, '黄金ETF(东方)': 0, '电网设备ETF': 0, '易方达现金增利货币B': 100716.91, '易方达国防军工混合': 10019.61, '易方达创业板ETF连接C': 9664.26, '易方达蓝筹精选': 6920.48 },
      '2026-03': { '巨化股份': 0, '豫光金铅': 0, '恒泰reit': 0, '百联reit': 0, '北保reit': 0, '黄金ETF(中金)': 0, '国债逆回购': 320143, '南网储能': 8388, '化工ETF': 4335, '黄金ETF(东方)': 24247.50, '电网设备ETF': 4650, '易方达现金增利货币B': 100839.38, '易方达国防军工混合': 9151.54, '易方达创业板ETF连接C': 9553.43, '易方达蓝筹精选': 6579.12 },
      '2026-04': { '巨化股份': 0, '豫光金铅': 0, '恒泰reit': 0, '百联reit': 0, '北保reit': 0, '黄金ETF(中金)': 0, '国债逆回购': 100343.15, '南网储能': 8628, '化工ETF': 4775, '黄金ETF(东方)': 24195, '电网设备ETF': 4930, '易方达现金增利货币B': 100957.89, '易方达国防军工混合': 0, '易方达创业板ETF连接C': 0, '易方达蓝筹精选': 6446.44 },
      '2026-05': { '巨化股份': 0, '豫光金铅': 0, '恒泰reit': 0, '百联reit': 0, '北保reit': 0, '黄金ETF(中金)': 0, '国债逆回购': 130478.64, '南网储能': 9372, '化工ETF': 4080, '黄金ETF(东方)': 23492.50, '电网设备ETF': 5220, '易方达现金增利货币B': 101069.04, '易方达国防军工混合': 0, '易方达创业板ETF连接C': 0, '易方达蓝筹精选': 5933.85 },
      '2026-06': { '巨化股份': 0, '豫光金铅': 0, '恒泰reit': 0, '百联reit': 0, '北保reit': 0, '黄金ETF(中金)': 0, '国债逆回购': 129000+6515.12, '南网储能': 7380, '化工ETF': 4310, '黄金ETF(东方)': 20945, '电网设备ETF': 0, '易方达现金增利货币B': 101180.17, '易方达国防军工混合': 0, '易方达创业板ETF连接C': 0, '易方达蓝筹精选': 5603.62 }
    };
    Object.keys(fundProducts).forEach(m => {
      if (initialData.months[m]) {
        initialData.months[m].funds = fundProducts[m];
      }
    });

    initialData.months['2026-01'].income = { '工资1': 8594*2 };
    initialData.months['2026-01'].expenses = { '美容手机': 10000, '房贷': 10400, '房租': 13000*3-7300*3, '医院': 500 };
    initialData.months['2026-06'].income = { '工资': 8594*2, '房租': 7300 };
    initialData.months['2026-06'].expenses = { '房贷': 10400, '房租': 13000*3 };

    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API 路由
app.post('/api/login', (req, res) => {
  const data = readData();
  if (req.body.password === data.password) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

app.post('/api/change-password', (req, res) => {
  const data = readData();
  data.password = req.body.newPassword;
  saveData(data);
  res.json({ ok: true });
});

app.get('/api/months', (req, res) => {
  const data = readData();
  res.json(Object.keys(data.months).sort());
});

app.get('/api/month/:month', (req, res) => {
  const data = readData();
  const m = data.months[req.params.month];
  if (!m) return res.json({ ok: false });
  res.json(m);
});

app.post('/api/month/:month', (req, res) => {
  const data = readData();
  const month = req.params.month;
  if (!data.months[month]) {
    data.months[month] = {
      bankAccounts: {}, licai: {}, funds: {},
      receivables: 0, debts: {}, income: {}, expenses: {}
    };
  }
  const payload = req.body;
  if (payload.bankAccounts) data.months[month].bankAccounts = payload.bankAccounts;
  if (payload.licai) data.months[month].licai = payload.licai;
  if (payload.funds) data.months[month].funds = payload.funds;
  if (payload.receivables !== undefined) data.months[month].receivables = payload.receivables;
  if (payload.debts) data.months[month].debts = payload.debts;
  if (payload.income) data.months[month].income = payload.income;
  if (payload.expenses) data.months[month].expenses = payload.expenses;
  saveData(data);
  res.json({ ok: true });
});

// 导出所有数据（备份用）
app.get('/api/export', (req, res) => {
  const data = readData();
  res.json(data);
});

// 导入数据（恢复用）
app.post('/api/import', (req, res) => {
  const importData = req.body;
  if (!importData || !importData.months) {
    return res.json({ ok: false, msg: '数据格式错误' });
  }
  // 保留当前密码，或使用导入文件的密码
  const currentData = readData();
  importData.password = currentData.password;
  saveData(importData);
  res.json({ ok: true, msg: '数据恢复成功' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 月度账本已启动！`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://<本机IP>:${PORT}`);
  console.log(`  线上访问: 通过 Render 分配的 URL`);
  console.log(`📁 数据文件: ${DATA_FILE}`);
});
