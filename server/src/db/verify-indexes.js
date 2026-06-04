/**
 * DB-03 검증 러너 (psql 미설치 환경용)
 *
 * database/verify-indexes.sql 을 실제 DB 에 실행하여
 *   [1] 인덱스 목록  [2] FK 삭제정책  [3] 충돌조회 인덱스 사용 + FK 동작
 * 을 검증하고, 충돌 조회가 ix_schedules_team_time 을 사용하는지(Seq Scan 아님) 단정한다.
 *
 * 실행: node server/src/db/verify-indexes.js   (루트 .env 의 DATABASE_URL 사용)
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const SQL_PATH = path.resolve(__dirname, '../../../database/verify-indexes.sql');

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  const notices = [];
  client.on('notice', (n) => notices.push(n.message));

  await client.connect();
  try {
    const results = await client.query(sql); // 다중 구문 → 결과 배열
    const list = Array.isArray(results) ? results : [results];

    // [1] 인덱스 / [2] FK 정책 결과 출력
    const indexRes = list.find((r) => r.fields?.some((f) => f.name === 'indexname'));
    const fkRes = list.find((r) => r.fields?.some((f) => f.name === 'on_delete'));
    if (indexRes) {
      console.log('\n[1] 인덱스 목록 (%d개)', indexRes.rowCount);
      for (const row of indexRes.rows) console.log(`    ${row.tablename.padEnd(26)} ${row.indexname}`);
    }
    if (fkRes) {
      console.log('\n[2] FK ON DELETE 정책');
      for (const row of fkRes.rows)
        console.log(`    ${row.child_table.padEnd(26)} ${row.fk_column.padEnd(18)} -> ${row.on_delete}`);
    }

    // [3-1] EXPLAIN 계획
    const explainRes = list.find((r) => r.command === 'EXPLAIN');
    const planText = explainRes ? explainRes.rows.map((r) => r['QUERY PLAN']).join('\n') : '';
    console.log('\n[3-1] 충돌 조회 EXPLAIN 계획');
    console.log(planText.split('\n').map((l) => '    ' + l).join('\n'));

    // [3-2/3-3] DO 블록 NOTICE (RESTRICT / CASCADE)
    console.log('\n[3-2/3-3] FK 동작 검증');
    for (const m of notices) console.log('    ' + m);

    // 단정: ix_schedules_team_time 사용 + schedules Seq Scan 아님
    const usesIndex = /ix_schedules_team_time/.test(planText);
    const seqScan = /Seq Scan on schedules/.test(planText);
    const restrictOk = notices.some((m) => /\[RESTRICT\]/.test(m));
    const cascadeOk = notices.some((m) => /\[CASCADE\]/.test(m));

    console.log('\n=== 판정 ===');
    console.log(`    충돌조회 ix_schedules_team_time 사용 : ${usesIndex ? 'PASS' : 'FAIL'}`);
    console.log(`    schedules Seq Scan 미사용           : ${seqScan ? 'FAIL' : 'PASS'}`);
    console.log(`    FK RESTRICT 차단                    : ${restrictOk ? 'PASS' : 'FAIL'}`);
    console.log(`    FK CASCADE 전파                     : ${cascadeOk ? 'PASS' : 'FAIL'}`);

    const ok = usesIndex && !seqScan && restrictOk && cascadeOk;
    console.log(`\n전체: ${ok ? 'PASS ✅' : 'FAIL ❌'}`);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('verify-indexes 실행 오류:', err.message);
  process.exitCode = 1;
});
