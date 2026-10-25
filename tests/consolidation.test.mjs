import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('../references/migration.md',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('consolidated migration rules',()=>{
 assert.equal(pkg.version,'0.3.0');
 for(const pattern of [/request isolation/i,/Server Components vs\. Client Components/i,/shared mutable i18n instance/i,/infrastructure operational/i,/uninventoried/i,/specify → clarify/i,/formally decided/i]) assert.match(migration,pattern);
});
