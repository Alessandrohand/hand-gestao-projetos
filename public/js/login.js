/* ============================================================
   Página de login — Google ou e-mail e senha (Firebase Auth)
   Após autenticar: exige e-mail verificado e cadastro em /autorizados.
   ============================================================ */
import { cfg, configurado, ehAmbienteLocal, iniciarFirebase, usuarioAtualAuth, autorizacao, telaErroConfig } from './firebase.js';

const root = document.getElementById('login-root');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOGO = typeof ASSETS !== 'undefined' ? ASSETS.hand.logoFull : '';
const VOLTAR = location.origin + location.pathname;  // volta para esta página após verificar e-mail ou redefinir senha

const ERROS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Já existe um acesso com este e-mail. Use "Entrar" ou "Esqueci a senha".',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/missing-password': 'Informe a senha.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de concluir.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.',
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase (Authentication › Configurações › Domínios autorizados).',
  'auth/operation-not-allowed': 'Este método de login não está ativado no Firebase (Authentication › Método de login).',
  'auth/account-exists-with-different-credential': 'Este e-mail já usa outro método de login. Entre pelo método original.',
};
const msgErro = e => ERROS[e?.code] || ('Não foi possível concluir: ' + (e?.message || e));

function moldura(html) {
  root.innerHTML = `<div class="login"><div class="login-card"><img src="${LOGO}" alt="Hand" class="login-logo"><div class="login-sub">Gestão de Projetos</div>${html}</div><div class="login-foot">©2026 hand/™ · DOCUMENTO CONFIDENCIAL</div></div>`;
}
const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

(async function () {
  if (!configurado) {
    if (ehAmbienteLocal) { location.replace('index.html'); return; } // modo local não tem login
    return telaErroConfig(root);
  }
  let F_;
  try { F_ = await iniciarFirebase(); } catch (e) { return moldura(`<div class="note warn">Falha ao carregar o Firebase: ${esc(e.message)}</div>`); }
  const { auth, fs, A, F } = F_;
  const params = new URLSearchParams(location.search);

  /* ---------- telas ---------- */
  function telaEntrar(aba = 'entrar', aviso = '', emailPre = '') {
    const tabs = [['entrar', 'Entrar'], ['criar', 'Criar acesso'], ['senha', 'Esqueci a senha']];
    moldura(`
      <button class="btn-google" id="b-google" type="button">${GOOGLE_SVG}<span>Entrar com Google</span></button>
      <div class="login-div"><span>ou com e-mail</span></div>
      <div class="login-tabs">${tabs.map(([k, l]) => `<button type="button" data-aba="${k}" class="${aba === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${aviso}
      <form id="f-mail" novalidate>
        <label class="login-lbl" for="l-email">E-mail corporativo</label>
        <input type="email" id="l-email" autocomplete="email" required placeholder="nome@handgc.com.br" value="${esc(emailPre)}">
        ${aba !== 'senha' ? `<label class="login-lbl" for="l-senha">Senha</label><input type="password" id="l-senha" autocomplete="${aba === 'criar' ? 'new-password' : 'current-password'}" minlength="6" required>` : ''}
        ${aba === 'criar' ? `<label class="login-lbl" for="l-senha2">Confirme a senha</label><input type="password" id="l-senha2" autocomplete="new-password" minlength="6" required>` : ''}
        <div id="l-msg"></div>
        <button class="btn" type="submit" style="width:100%;margin-top:12px">${{ entrar: 'Entrar', criar: 'Criar acesso', senha: 'Enviar link de redefinição' }[aba]}</button>
      </form>
      ${aba === 'criar' ? '<p class="tiny muted" style="margin-top:10px">O acesso só é liberado para e-mails cadastrados pelo gestor. Após criar, confirme o e-mail pelo link que você vai receber.</p>' : ''}`);
    const msg = (t, cls = 'warn') => { document.getElementById('l-msg').innerHTML = t ? `<div class="note ${cls}" style="margin-top:10px">${t}</div>` : ''; };
    root.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => telaEntrar(b.dataset.aba, '', document.getElementById('l-email').value));
    document.getElementById('b-google').onclick = async () => {
      const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      try { await A.signInWithPopup(auth, p); await aposLogin(); } catch (e) { msg(msgErro(e)); }
    };
    document.getElementById('f-mail').onsubmit = async ev => {
      ev.preventDefault();
      const email = document.getElementById('l-email').value.trim().toLowerCase();
      const senha = document.getElementById('l-senha')?.value || '';
      const btn = ev.submitter || ev.target.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        if (!email) throw { code: 'auth/invalid-email' };
        if (aba === 'entrar') { await A.signInWithEmailAndPassword(auth, email, senha); await aposLogin(); }
        else if (aba === 'criar') {
          if (senha !== document.getElementById('l-senha2').value) { btn.disabled = false; return msg('As senhas não conferem.'); }
          const cred = await A.createUserWithEmailAndPassword(auth, email, senha);
          await A.sendEmailVerification(cred.user, { url: VOLTAR });
          telaVerificar(cred.user, true);
        } else {
          await A.sendPasswordResetEmail(auth, email, { url: VOLTAR });
          telaEntrar('entrar', `<div class="note">Se houver um acesso para <b>${esc(email)}</b>, você receberá um e-mail para criar uma nova senha. Verifique também o spam.</div>`, email);
        }
      } catch (e) { btn.disabled = false; msg(msgErro(e)); }
    };
  }

  function telaVerificar(user, recemCriado = false) {
    moldura(`<div class="note">${recemCriado ? 'Acesso criado. ' : ''}Enviamos um link de confirmação para <b>${esc(user.email)}</b>.<br>Clique no link do e-mail e depois em <b>Já confirmei</b>. Verifique também o spam.</div>
      <div id="l-msg"></div>
      <button class="btn" id="b-conf" style="width:100%;margin-top:14px">Já confirmei</button>
      <button class="btn ghost" id="b-reenv" style="width:100%;margin-top:8px">Reenviar e-mail</button>
      <button class="btn ghost" id="b-out" style="width:100%;margin-top:8px">Usar outra conta</button>`);
    const msg = t => { document.getElementById('l-msg').innerHTML = t ? `<div class="note warn" style="margin-top:10px">${t}</div>` : ''; };
    document.getElementById('b-conf').onclick = async () => {
      try { await user.reload(); if (!auth.currentUser.emailVerified) return msg('O e-mail ainda não foi confirmado.'); await auth.currentUser.getIdToken(true); await aposLogin(); } catch (e) { msg(msgErro(e)); }
    };
    document.getElementById('b-reenv').onclick = async () => { try { await A.sendEmailVerification(user, { url: VOLTAR }); msg('E-mail reenviado.'); } catch (e) { msg(msgErro(e)); } };
    document.getElementById('b-out').onclick = async () => { await A.signOut(auth); telaEntrar(); };
  }

  function telaNaoAutorizado(email) {
    moldura(`<div class="note warn"><b>${esc(email)}</b> não está autorizado a acessar esta ferramenta.<br>Peça ao gestor para cadastrar este e-mail em <b>Cadastros › Consultores</b>.</div>
      <button class="btn ghost" id="b-out" style="width:100%;margin-top:14px">Entrar com outra conta</button>`);
    document.getElementById('b-out').onclick = async () => { await A.signOut(auth); telaEntrar(); };
  }

  async function aposLogin() {
    const u = auth.currentUser; if (!u) return telaEntrar();
    if (!u.emailVerified) { try { await A.sendEmailVerification(u, { url: VOLTAR }); } catch (e) { } return telaVerificar(u); }
    moldura('<p class="muted">Verificando autorização…</p>');
    const aut = await autorizacao(fs, F, u.email);
    if (!aut) return telaNaoAutorizado(u.email);
    location.replace('index.html');
  }

  /* ---------- início ---------- */
  const u = await usuarioAtualAuth(auth, A);
  if (u) {
    if (!u.emailVerified) { try { await u.reload(); } catch (e) { } }
    if (auth.currentUser?.emailVerified) await auth.currentUser.getIdToken(true).catch(() => { });
    return aposLogin();
  }
  telaEntrar('entrar', params.get('saiu') ? '<div class="note">Sessão encerrada.</div>' : '');
})();
