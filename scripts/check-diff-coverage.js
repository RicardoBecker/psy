#!/usr/bin/env node
/**
 * Gate de cobertura de código NOVO/ALTERADO (diff coverage), não do projeto
 * inteiro. Meta padrão: 90% das linhas cobríveis adicionadas/alteradas em
 * relação à base precisam estar cobertas por teste.
 *
 * Uso:
 *   node scripts/check-diff-coverage.js <appDir> [--base=<ref>] [--threshold=<n>]
 *
 * Exemplos:
 *   node scripts/check-diff-coverage.js apps/backend
 *   node scripts/check-diff-coverage.js apps/frontend --base=origin/main --threshold=90
 *
 * Pré-requisito: rodar a suíte de testes do app com cobertura em JSON antes
 * (ex.: `npm run test:cov` dentro do app), gerando coverage/coverage-final.json.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const [appDirArg, ...rest] = argv;
  if (!appDirArg) {
    console.error('Uso: node scripts/check-diff-coverage.js <appDir> [--base=<ref>] [--threshold=<n>]');
    process.exit(2);
  }
  let base = process.env.DIFF_COVERAGE_BASE || 'origin/main';
  let threshold = Number(process.env.DIFF_COVERAGE_THRESHOLD || 90);
  for (const arg of rest) {
    if (arg.startsWith('--base=')) base = arg.slice('--base='.length);
    if (arg.startsWith('--threshold=')) threshold = Number(arg.slice('--threshold='.length));
  }
  return { appDir: appDirArg, base, threshold };
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
}

function resolveBase(repoRoot, base) {
  try {
    git(['rev-parse', '--verify', base], repoRoot);
    return base;
  } catch {
    // origin/main pode não existir localmente (ex.: clone raso); cai para main
    return 'main';
  }
}

// Faz o parse de `git diff --unified=0` e retorna, por arquivo, o conjunto de
// números de linha ADICIONADOS/ALTERADOS no lado novo (HEAD).
function getAddedLinesByFile(repoRoot, base, appDir) {
  const mergeBase = git(['merge-base', base, 'HEAD'], repoRoot).trim();
  // Compara a base contra o working tree (inclui mudanças staged/unstaged,
  // não só o que já foi commitado) — é o que se quer checar antes de abrir PR.
  const diff = git(['diff', '--unified=0', '--no-color', mergeBase, '--', appDir], repoRoot);

  const addedByFile = new Map();
  let currentFile = null;
  let newLine = null;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const filePath = line.slice(4).trim();
      currentFile = filePath === '/dev/null' ? null : filePath.replace(/^b\//, '');
      continue;
    }
    if (line.startsWith('@@')) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (match) {
        newLine = Number(match[1]);
      }
      continue;
    }
    if (currentFile === null) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (!addedByFile.has(currentFile)) addedByFile.set(currentFile, new Set());
      addedByFile.get(currentFile).add(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // linha removida: não consome o contador do lado novo
    }
  }

  return addedByFile;
}

// Constrói um mapa linha → quantidade de hits a partir do coverage-final.json
// de um arquivo (istanbul), combinando statementMap e fnMap.
function buildLineHitMap(entry) {
  const hits = new Map();

  for (const [id, loc] of Object.entries(entry.statementMap || {})) {
    const count = (entry.s || {})[id] ?? 0;
    for (let line = loc.start.line; line <= loc.end.line; line++) {
      hits.set(line, Math.max(hits.get(line) ?? 0, count));
    }
  }

  for (const [id, fn] of Object.entries(entry.fnMap || {})) {
    const count = (entry.f || {})[id] ?? 0;
    const line = fn.decl?.start?.line ?? fn.loc?.start?.line;
    if (line != null) {
      hits.set(line, Math.max(hits.get(line) ?? 0, count));
    }
  }

  return hits;
}

function main() {
  const { appDir, base, threshold } = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '..');
  const absAppDir = path.resolve(repoRoot, appDir);
  const coveragePath = path.join(absAppDir, 'coverage', 'coverage-final.json');

  if (!fs.existsSync(coveragePath)) {
    console.error(
      `Não encontrei ${path.relative(repoRoot, coveragePath)}. Rode a suíte com cobertura em JSON antes (ex.: "npm run test:cov" dentro de ${appDir}).`,
    );
    process.exit(2);
  }

  const resolvedBase = resolveBase(repoRoot, base);
  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const addedByFile = getAddedLinesByFile(repoRoot, resolvedBase, appDir);

  let totalCoverable = 0;
  let totalCovered = 0;
  const uncoveredReport = [];

  for (const [relFile, lines] of addedByFile) {
    const absFile = path.resolve(repoRoot, relFile);
    const entry = coverage[absFile];
    if (!entry) continue; // arquivo fora do collectCoverageFrom (ex.: *.spec.ts, migrations, config)

    const lineHits = buildLineHitMap(entry);

    for (const line of lines) {
      if (!lineHits.has(line)) continue; // linha não instrumentada (branco, import, chave, tipo)
      totalCoverable++;
      const hit = lineHits.get(line) > 0;
      if (hit) {
        totalCovered++;
      } else {
        uncoveredReport.push(`${relFile}:${line}`);
      }
    }
  }

  const pct = totalCoverable === 0 ? 100 : (totalCovered / totalCoverable) * 100;

  console.log(`\nCobertura do diff — ${appDir} (base: ${resolvedBase})`);
  console.log(`Linhas cobríveis alteradas: ${totalCoverable}`);
  console.log(`Linhas cobertas: ${totalCovered}`);
  console.log(`Cobertura: ${pct.toFixed(1)}% (meta: ${threshold}%)`);

  if (uncoveredReport.length > 0) {
    console.log('\nLinhas alteradas sem cobertura:');
    for (const loc of uncoveredReport) console.log(`  - ${loc}`);
  }

  if (totalCoverable === 0) {
    console.log('\nNenhuma linha cobrível foi alterada neste diff — passando trivialmente.');
    process.exit(0);
  }

  if (pct < threshold) {
    console.error(`\n❌ Cobertura do diff (${pct.toFixed(1)}%) abaixo da meta (${threshold}%).`);
    process.exit(1);
  }

  console.log('\n✅ Cobertura do diff dentro da meta.');
  process.exit(0);
}

main();
