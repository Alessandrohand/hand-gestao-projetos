/* ============================================================
   Inicialização do app (index.html)
   - Firebase configurado  → exige sessão (login.html) e grava no Firestore,
                             com atualização em tempo real entre dispositivos.
   - Sem configuração      → só em localhost: modo local de demonstração.
                             Em produção: tela de erro de configuração
                             (nunca cai em modo local silenciosamente).
   ============================================================ */
import { configurado, ehAmbienteLocal, iniciarFirebase, usuarioAtualAuth, autorizacao, telaErroConfig } from './firebase.js';

const appEl = () => document.getElementById('app');
function telaSimples(conteudo) {
  appEl().innerHTML = `<div class="login"><div class="login-card"><img src="${ASSETS.hand.logoFull}" alt="Hand" class="login-logo"><div class="login-sub">Gestão de Projetos</div>${conteudo}</div><div class="login-foot">©2026 hand/™ · DOCUMENTO CONFIDENCIAL</div></div>`;
}

if (!configurado) {
  if (ehAmbienteLocal) iniciarLocal();
  else telaErroConfig(appEl());
} else {
  iniciarOnline().catch(e => telaSimples(`<div class="note warn">Falha ao iniciar: ${esc(e.message)}</div>`));
}

async function iniciarOnline() {
  telaSimples('<p class="muted">Carregando…</p>');
  const { auth, fs, A, F } = await iniciarFirebase();

  /* ---------- sessão obrigatória ---------- */
  const user = await usuarioAtualAuth(auth, A);
  if (!user || !user.emailVerified) return location.replace('login.html');
  const email = user.email.toLowerCase();
  const aut = await autorizacao(fs, F, email);
  if (!aut) return location.replace('login.html');
  window.AUTH_EMAIL = email;

  let unsubs = [];
  const parar = () => { unsubs.forEach(u => u()); unsubs = []; };
  window.sairApp = async () => { parar(); await A.signOut(auth); location.replace('login.html?saiu=1'); };
  // saiu em outra aba ou sessão expirou → volta ao login
  A.onAuthStateChanged(auth, u => { if (!u) { parar(); location.replace('login.html'); } });

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
  Persist = {
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

  /* ---------- leitura em tempo real ---------- */
  DB = normalizar({});
  let configExiste = false, iniciado = false;
  const esperados = new Set([...COLECOES, 'config', 'log']), prontos = new Set();
  const pronto = c => {
    prontos.add(c);
    if (iniciado) return agendarRender();
    if (prontos.size < esperados.size) return;
    iniciado = true;
    if (!configExiste) return telaInicializar(aut.perfil, email);
    if (!usuarioAtual()) return telaSimples(`<div class="note warn">O e-mail <b>${esc(email)}</b> está autorizado, mas não há consultor ativo com este e-mail em Cadastros › Consultores.</div><button class="btn ghost" style="margin-top:14px" onclick="sairApp()">Sair</button>`);
    render();
  };
  const erro = e => telaSimples(`<div class="note warn">Erro ao ler dados: ${esc(e.code === 'permission-denied' ? 'sem permissão (confira as regras do Firestore e o cadastro em autorizados)' : e.message)}</div><button class="btn ghost" style="margin-top:14px" onclick="sairApp()">Sair</button>`);
  COLECOES.forEach(c => unsubs.push(F.onSnapshot(F.collection(fs, c), s => { DB[c] = s.docs.map(d => d.data()); ultimo[c] = DB[c]; pronto(c); }, erro)));
  unsubs.push(F.onSnapshot(F.doc(fs, 'config', 'geral'), d => {
    configExiste = d.exists();
    if (configExiste) { const x = d.data(); delete x.id; DB.config = { ...DB.config, ...x }; ultimo.config = DB.config; }
    pronto('config');
  }, erro));
  unsubs.push(F.onSnapshot(F.query(F.collection(fs, 'log'), F.orderBy('quando', 'desc'), F.limit(300)), s => { DB.log = s.docs.map(d => d.data()); ultimo.log = DB.log; pronto('log'); }, erro));

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
