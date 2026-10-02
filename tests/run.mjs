import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
const files=['src/data/questions.ts','src/data/profiles.ts','src/utils/scoring.ts','tests/scoring.test.ts'];
fs.mkdirSync('.test-build',{recursive:true});
fs.writeFileSync('.test-build/package.json','{"type":"commonjs"}');
for(const file of files){const dest=path.join('.test-build',file.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)}
const r=spawnSync(process.execPath,['--test','.test-build/tests/scoring.test.js'],{stdio:'inherit'});process.exit(r.status??1);
