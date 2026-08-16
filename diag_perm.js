
const { Client } = require('ssh2');
const fs = require('fs');
const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const conn = new Client();
conn.on('ready', () => {
  const PHP = '<?php require "config/Database.php"; $db = (new Database())->getConnection(); foreach ($db->query("SELECT id, name FROM permissions ORDER BY id") as $r) { echo $r["id"] . ": " . $r["name"] . PHP_EOL; } echo "--- roles ---\n"; foreach ($db->query("SELECT id, name FROM roles") as $r) { echo $r["id"] . ": " . $r["name"] . PHP_EOL; }';
  const B64 = Buffer.from(PHP, 'utf-8').toString('base64');
  conn.exec('echo ' + B64 + ' | base64 -d > ' + REMOTE_ROOT + '/server/tmp_perm.php && cd ' + REMOTE_ROOT + '/server && php tmp_perm.php 2>&1; rm -f tmp_perm.php', (err, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o.trim()); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

