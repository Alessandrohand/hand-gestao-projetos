/* ============================================================
   Inicialização: modo local (sem Firebase) ou modo online
   (Firebase Auth por link de e-mail + Cloud Firestore em tempo real)
   ============================================================ */
const FB_VERSION = '10.12.2';
const FB = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
const cfg = window.FIREBASE_CONFIG || {};
const KEY_EMAIL = 'hand.gp.emailLogin';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { } };
const appEl = () => document.getElementById('app');

function telaSimples(conteudo) {
  appEl().innerHTML = `<div class="login"><div class="login-card"><img src="${ASSETS.hand.logoFull}" alt="Hand" class="login-logo"><div class="login-sub">Gestão de Projetos</div>${conteudo}</div><div class="login-foot">©2026 hand/™ · DOCUMENTO CONFIDENCIAL</div></div>`;
}

if (!cfg.apiKey) iniciarLocal();
else iniciarOnline().catch(e => telaSimples(`<div class="note warn">Falha ao iniciar: ${esc(e.message)}</div>`));

async function iniciarOnline() {
  telaSimples('<p class="muted">Carregando…</p>');
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${FB}/firebase-app.js`), import(`${FB}/firebase-auth.js`), import(`${FB}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  const fs = F.getFirestore(app);
  if (cfg.emulador) { // apenas para testes locais com o Firebase Emulator Suite
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(fs, '127.0.0.1', 8080);
  }
  await A.setPersistence(auth, A.browserLocalPersistence);
  let unsubs = [];
  const parar = () => { unsubs.forEach(u => u()); unsubs = []; };
  window.sairApp = async () => { parar(); await A.signOut(auth); location.reload(); };

  /* ---------- login por link ---------- */
  function telaLogin(msg = '') {
    telaSimples(`<p class="login-txt">Informe seu e-mail corporativo. Você receberá um link de acesso — não há senha.</p>
      ${msg ? `<div class="note warn" style="margin-bottom:12px">${msg}</div>` : ''}
      <form id="f-login"><input type="email" id="l-email" required placeholder="nome@handgc.com.br" value="${esc(lsGet(KEY_EMAIL) || '')}"><button class="btn" type="submit" style="width:100%;margin-top:10px">Enviar link de acesso</button></form>`);
    document.getElementById('f-login').onsubmit = async ev => {
      ev.preventDefault();
      const email = document.getElementById('l-email').value.trim().toLowerCase();
      try {
        await A.sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
        lsSet(KEY_EMAIL, email);
        telaSimples(`<div class="note">Link enviado para <b>${esc(email)}</b>.<br>Abra o e-mail <b>neste mesmo navegador</b> e clique no link. Verifique também a caixa de spam.</div><button class="btn ghost" style="margin-top:14px" onclick="location.reload()">Voltar</button>`);
      } catch (e) { telaLogin('Não foi possível enviar o link: ' + esc(e.message)); }
    };
  }
  if (A.isSignInWithEmailLink(auth, location.href)) {
    let email = lsGet(KEY_EMAIL) || prompt('Confirme o e-mail usado para solicitar o link:');
    try { await A.signInWithEmailLink(auth, email, location.href); }
    catch (e) { history.replaceState(null, '', location.pathname); return telaLogin('Link inválido ou expirado. Solicite um novo.'); }
    history.replaceState(null, '', location.pathname);
  }

  /* ---------- adaptador Firestore ---------- */
  const limpo = r => JSON.parse(JSON.stringify(r));
  const ultimo = {};
  async function gravar(ops) {
    for (let i = 0; i < ops.length; i += 450) {
      const b = F.writeBatch(fs);
      ops.slice(i, i + 450).forEach(([tipo, c, id, r]) => tipo === 'set' ? b.set(F.doc(fs, c, id), limpo(r)) : b.delete(F.doc(fs, c, id)));
      await b.commit();
    }
  }
  const FirestorePersist = {
    modo: 'firebase',
    async commit(ctx) {
      const ops = [];
      try {
        if (ctx.substituirTudo) {
          for (const c of COLECOES.concat(['log'])) {
            const atuais = await F.getDocs(F.collection(fs, c));
            const manter = new Set((DB[c] || []).map(r => r.id));
            atuais.forEach(d => { if (!manter.has(d.id)) ops.push(['del', c, d.id]); });
            (DB[c] || []).forEach(r => ops.push(['set', c, r.id, r]));
          }
          ops.push(['set', 'config', 'geral', { ...DB.config, id: 'geral' }]);
          DB.consultores.filter(c => c.email).forEach(c => ops.push(['set', 'autorizados', emailKey(c.email), autorizacaoDe(c)]));
          ctx.alterados.filter(([c]) => c === 'log').forEach(([c, r]) => ops.push(['set', c, r.id, r]));
        } else {
          ctx.alterados.forEach(([c, r]) => ops.push(['set', c, r.id, r]));
          ctx.removidos.forEach(([c, id]) => ops.push(['del', c, id]));
        }
        await gravar(ops);
      } catch (e) {
        // reverte a cópia local para o último estado confirmado pelo servidor
        Object.keys(ultimo).forEach(k => { DB[k] = JSON.parse(JSON.stringify(ultimo[k])); });
        agendarRender();
        throw new Error(e.code === 'permission-denied' ? 'Sem permissão para esta operação.' : 'Falha ao gravar: ' + e.message);
      }
    },
  };

  /* ---------- sessão ---------- */
  A.onAuthStateChanged(auth, async user => {
    parar();
    if (!user) return telaLogin();
    const email = (user.email || '').toLowerCase();
    window.AUTH_EMAIL = email;
    let aut;
    try { aut = await F.getDoc(F.doc(fs, 'autorizados', email)); } catch (e) { aut = null; }
    if (!aut || !aut.exists() || !aut.data().ativo) {
      return telaSimples(`<div class="note warn"><b>${esc(email)}</b> não está autorizado a acessar esta ferramenta.<br>Peça ao gestor para cadastrar seu e-mail em Cadastros › Consultores.</div><button class="btn ghost" style="margin-top:14px" onclick="sairApp()">Sair</button>`);
    }
    const perfil = aut.data().perfil;
    Persist = FirestorePersist;
    DB = normalizar({});
    let configExiste = false, iniciado = false;
    const esperados = new Set([...COLECOES, 'config', 'log']), prontos = new Set();
    const pronto = c => {
      prontos.add(c);
      if (iniciado) return agendarRender();
      if (prontos.size < esperados.size) return;
      iniciado = true;
      if (!configExiste) return telaInicializar(perfil, email);
      if (!usuarioAtual()) console.warn('E-mail autorizado sem consultor ativo correspondente.');
      render();
    };
    const erro = e => telaSimples(`<div class="note warn">Erro ao ler dados: ${esc(e.message)}</div><button class="btn ghost" style="margin-top:14px" onclick="sairApp()">Sair</button>`);
    COLECOES.forEach(c => unsubs.push(F.onSnapshot(F.collection(fs, c), s => { DB[c] = s.docs.map(d => d.data()); ultimo[c] = DB[c]; pronto(c); }, erro)));
    unsubs.push(F.onSnapshot(F.doc(fs, 'config', 'geral'), d => {
      configExiste = d.exists();
      if (configExiste) { const x = d.data(); delete x.id; DB.config = { ...DB.config, ...x }; ultimo.config = DB.config; }
      pronto('config');
    }, erro));
    unsubs.push(F.onSnapshot(F.query(F.collection(fs, 'log'), F.orderBy('quando', 'desc'), F.limit(300)), s => { DB.log = s.docs.map(d => d.data()); ultimo.log = DB.log; pronto('log'); }, erro));
  });

  function telaInicializar(perfil, email) {
    if (perfil !== 'gestor') return telaSimples(`<div class="note warn">A base ainda não foi inicializada. Aguarde o gestor fazer o primeiro acesso.</div><button class="btn ghost" style="margin-top:14px" onclick="sairApp()">Sair</button>`);
    telaSimples(`<div class="note">Primeiro acesso: a base está vazia.<br>Inicializar com os cadastros da Hand — 9 clientes, 9 projetos de Gestão Compartilhada, consultores e tipos de tarefa? Nenhum dado de demonstração será criado.</div>
      <button class="btn" id="b-init" style="width:100%;margin-top:14px">Inicializar base</button><button class="btn ghost" style="width:100%;margin-top:8px" onclick="sairApp()">Sair</button>`);
    document.getElementById('b-init').onclick = async () => {
      try { await invoke('gp.dados.inicializar', { email }); } catch (e) { return alert(e.message); }
      location.reload();
    };
  }
}
