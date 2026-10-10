// Cron-friendly backup: consistent DB snapshot + copy of uploads. Keeps the newest 14 of each.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const root = path.join(__dirname, '..');
const out = path.join(root, 'data', 'backups');
fs.mkdirSync(out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

(async () => {
  await db.backup(path.join(out, `vista-${stamp}.db`));
  const up = path.join(root, 'public', 'uploads');
  if (fs.existsSync(up)) fs.cpSync(up, path.join(out, `uploads-${stamp}`), { recursive: true });
  for (const [re, dir] of [[/^vista-[\w-]+\.db$/, false], [/^uploads-[\w-]+$/, true]]) {
    const all = fs.readdirSync(out).filter((f) => re.test(f)).sort();
    all.slice(0, Math.max(0, all.length - 14)).forEach((f) => fs.rmSync(path.join(out, f), { recursive: dir, force: true }));
  }
  console.log('Backup written to', out, stamp);
})();
