import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('production claim SQL survives real SQLite contention, quotas and transaction rollback',()=>{
  const r=spawnSync('python',['cloudflare/tests/test_production_sql.py','-v'],{encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,r.stdout+r.stderr);
});
