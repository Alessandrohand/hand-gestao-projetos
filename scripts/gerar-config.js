/* Gera public/js/firebase-config.js a partir das variáveis de ambiente.
   - No Render: variáveis definidas em Environment (usadas no build).
   - No computador: lê o arquivo .env da raiz, se existir.
   Sem FIREBASE_API_KEY, gera configuração vazia → ferramenta roda em modo local. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const envPath = path.join(raiz, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(linha => {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || linha.trim().startsWith('#')) return;
    const v = m[2].replace(/^['"]|['"]$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
}

const e = k => (process.env[k] || '').trim();
const config = {
  apiKey: e('FIREBASE_API_KEY'),
  authDomain: e('FIREBASE_AUTH_DOMAIN'),
  projectId: e('FIREBASE_PROJECT_ID'),
  storageBucket: e('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: e('FIREBASE_MESSAGING_SENDER_ID'),
  appId: e('FIREBASE_APP_ID'),
};
if (e('FIREBASE_USE_EMULATOR') === 'true') config.emulador = true;

const faltando = Object.entries(config).filter(([k, v]) => k !== 'emulador' && !v).map(([k]) => k);
if (!config.apiKey) console.warn('⚠  FIREBASE_API_KEY não definida: o site será publicado em MODO LOCAL (demonstração).');
else if (faltando.length) { console.error('✖  Variáveis faltando: ' + faltando.join(', ')); process.exit(1); }

const saida = path.join(raiz, 'public', 'js', 'firebase-config.js');
fs.writeFileSync(saida,
`/* Arquivo GERADO por scripts/gerar-config.js — não edite à mão.
   Os valores vêm das variáveis de ambiente (Render) ou do arquivo .env (local). */
window.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};
`);
console.log('✔  firebase-config.js gerado' + (config.apiKey ? ` para o projeto "${config.projectId}".` : ' (modo local).'));
