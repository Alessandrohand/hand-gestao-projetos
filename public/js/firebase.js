/* ============================================================
   Inicialização compartilhada do Firebase (index.html e login.html)
   ============================================================ */
const FB_VERSION = '10.12.2';
const FB = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;

export const cfg = window.FIREBASE_CONFIG || {};
export const ehAmbienteLocal = location.protocol === 'file:' || ['localhost', '127.0.0.1', ''].includes(location.hostname);
export const configurado = !!cfg.apiKey;

export async function iniciarFirebase() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${FB}/firebase-app.js`), import(`${FB}/firebase-auth.js`), import(`${FB}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  auth.languageCode = 'pt';
  const fs = F.getFirestore(app);
  if (cfg.emulador) { // apenas testes locais com o Firebase Emulator Suite
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(fs, '127.0.0.1', 8080);
  }
  await A.setPersistence(auth, A.browserLocalPersistence);
  return { app, auth, fs, A, F };
}

/* Resolve com o usuário atual assim que o Firebase restaurar a sessão. */
export function usuarioAtualAuth(auth, A) {
  return new Promise(res => { const off = A.onAuthStateChanged(auth, u => { off(); res(u); }); });
}

/* Retorna o registro em /autorizados/{email} se ativo; senão null. */
export async function autorizacao(fs, F, email) {
  try {
    const d = await F.getDoc(F.doc(fs, 'autorizados', String(email || '').toLowerCase()));
    return d.exists() && d.data().ativo ? d.data() : null;
  } catch (e) { return null; }
}

export function telaErroConfig(el) {
  el.innerHTML = `<div class="login"><div class="login-card"><img src="${typeof ASSETS !== 'undefined' ? ASSETS.hand.logoFull : ''}" alt="Hand" class="login-logo"><div class="login-sub">Gestão de Projetos</div>
  <div class="note warn"><b>Firebase não configurado neste site.</b><br>As variáveis <code>FIREBASE_*</code> não estavam disponíveis no build. No Render: aba <b>Environment</b> → confira as 6 variáveis → <b>Manual Deploy › Clear build cache &amp; deploy</b>.</div>
  <p class="tiny muted" style="margin-top:10px">Para testar sem banco, rode o site em localhost: ele abre em modo local com dados de demonstração.</p></div></div>`;
}
