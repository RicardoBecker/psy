#!/usr/bin/env node
/**
 * Política de audit de produção (CR-05.1/CR-05.2/CR-06.4): falha o build
 * para qualquer vulnerabilidade critical/high do `npm audit --omit=dev`
 * que NÃO esteja formalmente documentada em security-audit-exceptions.json
 * com responsável e prazo — e falha também se uma exceção já documentada
 * tiver passado do prazo (`expires`), voltando a bloquear o merge até ser
 * renovada ou corrigida de verdade.
 *
 * Uso: node scripts/check-audit.js <appDir>
 * Exemplo: node scripts/check-audit.js apps/backend
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  const appDir = process.argv[2];
  if (!appDir) {
    console.error('Uso: node scripts/check-audit.js <appDir>');
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const exceptionsPath = path.join(repoRoot, 'security-audit-exceptions.json');
  const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'))[appDir] || {};

  let auditJson;
  try {
    // npm audit sai com código != 0 quando encontra vulnerabilidades — não é
    // erro de execução, então não deixamos o try/catch tratar isso como falha.
    const output = execSync('npm audit --omit=dev --json', {
      cwd: path.join(repoRoot, appDir),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 16,
    });
    auditJson = JSON.parse(output);
  } catch (err) {
    // execSync lança quando o processo sai com código != 0; o JSON ainda
    // vem em stdout normalmente.
    auditJson = JSON.parse(err.stdout);
  }

  const vulnerabilities = auditJson.vulnerabilities || {};
  const blocking = [];
  const accepted = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [pkg, vuln] of Object.entries(vulnerabilities)) {
    if (vuln.severity !== 'critical' && vuln.severity !== 'high') continue;

    const exception = exceptions[pkg];
    if (!exception) {
      blocking.push({ pkg, severity: vuln.severity, reason: 'sem exceção documentada' });
      continue;
    }
    if (exception.expires < today) {
      blocking.push({
        pkg,
        severity: vuln.severity,
        reason: `exceção expirou em ${exception.expires}`,
      });
      continue;
    }
    accepted.push({ pkg, severity: vuln.severity, expires: exception.expires });
  }

  console.log(`\nPolítica de audit — ${appDir}`);
  if (accepted.length > 0) {
    console.log('\nExceções aceitas (documentadas, dentro do prazo):');
    for (const a of accepted) console.log(`  - ${a.pkg} (${a.severity}) — válida até ${a.expires}`);
  }

  if (blocking.length > 0) {
    console.error('\n❌ Vulnerabilidades critical/high sem exceção válida:');
    for (const b of blocking) console.error(`  - ${b.pkg} (${b.severity}): ${b.reason}`);
    console.error(
      '\nDocumente uma exceção formal em security-audit-exceptions.json (com responsável e prazo) ou corrija a dependência.',
    );
    process.exit(1);
  }

  console.log('\n✅ Nenhuma vulnerabilidade critical/high sem exceção válida.');
  process.exit(0);
}

main();
