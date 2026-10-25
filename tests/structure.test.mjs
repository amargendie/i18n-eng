import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
test('skill entrypoint and references exist',()=>{
 const skill=readFileSync(resolve(root,'SKILL.md'),'utf8');
 assert.match(skill,/^---\nname: i18n-eng/m);
 for(const file of ['principles','audit','greenfield','migration','maintenance']){
  assert.ok(existsSync(resolve(root,`references/${file}.md`)));
  assert.ok(skill.includes(`references/${file}.md`));
 }
});
test('audit and migration rules are retained',()=>{
 const audit=readFileSync(resolve(root,'references/audit.md'),'utf8');
 const migration=readFileSync(resolve(root,'references/migration.md'),'utf8');
 assert.match(audit,/coverage matrix/i);
 assert.match(migration,/catalog ownership/i);
 assert.match(migration,/informational.*CI/i);
 assert.match(migration,/separat.*change/i);
});
