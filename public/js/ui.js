/* ============================================================
   Telas
   ============================================================ */
const UI = { tab: 'painel', semana: semanaAtual(), projetoId: null, userId: null, fechConsultor: null, todasSemanas: false, indN: 8, cadTab: 'clientes', opProjetoId: null };
try { const s = JSON.parse(localStorage.getItem('hand.gp.ui') || '{}'); if (s.userId) UI.userId = s.userId; if (s.tab) UI.tab = s.tab; } catch (e) { }
function salvarUI() { try { localStorage.setItem('hand.gp.ui', JSON.stringify({ userId: UI.userId, tab: UI.tab })); } catch (e) { } }
function usuarioAtual() {
  if (!DB) return null;
  if (Persist.modo !== 'local') return DB.consultores.find(c => c.ativo && emailKey(c.email) === window.AUTH_EMAIL) || null;
  return con(UI.userId) || DB.consultores.find(c => c.perfil === 'gestor') || null;
}
const souGestor = () => usuarioAtual()?.perfil === 'gestor';

const TABS = [
  ['painel', 'Painel', '▦'], ['planejamento', 'Planejamento', '☰'], ['fechamento', 'Fechamento', '✓'],
  ['extra', 'Extraprojeto', '⏱'], ['aprovacoes', 'Aprovações', '⚖'], ['indicadores', 'Indicadores', '▮'],
  ['onepage', 'One-page', '▤'], ['cadastros', 'Cadastros', '⚙'], ['registro', 'Registro', '≡'],
];

/* ---------- helpers de UI ---------- */
function av(id, s = 28) {
  const c = con(id); if (!c) return '';
  const src = img(c.foto);
  if (src) return `<img class="av" src="${src}" alt="${esc(c.nome)}" title="${esc(c.nome)}" style="width:${s}px;height:${s}px">`;
  const ini_ = c.nome.split(' ').map(x => x[0]).slice(0, 2).join('');
  return `<span class="av ini" title="${esc(c.nome)}" style="width:${s}px;height:${s}px">${esc(ini_)}</span>`;
}
function avs(ids, s = 26) { return `<span class="avs">${[...new Set(ids)].map(i => av(i, s)).join('')}</span>`; }
function logoTile(c, w = 96, h = 52) { const src = img(c.logo); return `<div class="logo-tile" style="width:${w}px;height:${h}px">${src ? `<img src="${src}" alt="${esc(c.nome)}">` : `<b>${esc(c.sigla)}</b>`}</div>`; }
function statusIc(t) {
  if (t.status === 'concluida') return '<span class="st concluida" title="Concluída">✓</span>';
  if (t.status === 'nao_concluida') return expurgada(t) ? '<span class="st exp" title="Não concluída — expurgada">E</span>' : '<span class="st nao_concluida" title="Não concluída">✕</span>';
  return '<span class="st planejada" title="Planejada"></span>';
}
function chipOrigem(t) {
  if (!t.impedimento) return '';
  const o = ORIGENS[t.impedimento.origem];
  let ex = '';
  if (t.expurgo) ex = t.expurgo.status === 'pendente' ? ' <span class="chip y">expurgo pendente</span>' : t.expurgo.status === 'aprovado' ? ` <span class="chip g">expurgado${t.expurgo.auto ? ' (auto)' : ''}</span>` : ' <span class="chip r">expurgo recusado</span>';
  return `<span class="chip" style="border-color:${o.cor}">${esc(o.l.split(' (')[0])}</span>${ex}`;
}
function reprogChip(n) { return n ? `<span class="chip ${n >= 3 ? 'r' : n >= 2 ? 'y' : ''}" title="Reprogramações">↻ ${n}</span>` : ''; }
function toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
async function acao(slug, payload, okMsg) {
  try { const r = await invoke(slug, payload); if (okMsg) toast(okMsg); render(); return r; }
  catch (e) { alert(e.message); return null; }
}
function optList(arr, sel, labelFn = x => x.nome, valFn = x => x.id) { return arr.map(x => `<option value="${esc(valFn(x))}" ${valFn(x) === sel ? 'selected' : ''}>${esc(labelFn(x))}</option>`).join(''); }

/* ---------- modal / formulário genérico ---------- */
function abrirForm({ titulo, campos, valores = {}, botao = 'Salvar', nota = '', onSubmit, extraBotoes = '' }) {
  const ov = document.createElement('div'); ov.className = 'ov';
  const campo = f => {
    const v = valores[f.k] ?? f.def ?? '';
    let inp = '';
    if (f.t === 'textarea') inp = `<textarea name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
    else if (f.t === 'select') inp = `<select name="${f.k}">${f.vazio ? `<option value="">${esc(f.vazio)}</option>` : ''}${f.op.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    else if (f.t === 'checks') inp = `<div class="checks">${f.op.map(o => `<label><input type="checkbox" name="${f.k}" value="${esc(o.v)}" ${(v || []).includes(o.v) ? 'checked' : ''}> ${o.h || ''}${esc(o.l)}</label>`).join('')}</div>`;
    else if (f.t === 'bool') inp = `<label style="font-family:var(--fb);font-weight:400;display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}> ${esc(f.txt || '')}</label>`;
    else if (f.t === 'file') inp = `<input type="file" name="${f.k}" accept="image/*">${v ? `<div style="margin-top:6px"><img src="${img(v)}" style="max-height:48px;max-width:160px;object-fit:contain"></div>` : ''}`;
    else inp = `<input type="${f.t || 'text'}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.step ? `step="${f.step}"` : ''}>`;
    return `<div class="fld" data-f="${f.k}" style="${f.full ? 'grid-column:1/-1' : ''}"><label>${esc(f.l)}${f.req ? ' *' : ''}</label>${inp}${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
  };
  const meia = campos.filter(f => f.half);
  ov.innerHTML = `<div class="modal" role="dialog"><div class="mh"><h2>${esc(titulo)}</h2><button class="ibtn" data-x>✕</button></div>
  <form class="mb">${nota ? `<div class="note">${nota}</div>` : ''}
  ${(() => { let h = '', buf = []; campos.forEach(f => { if (f.half) buf.push(campo(f)); else { if (buf.length) { h += `<div class="fgrid">${buf.join('')}</div>`; buf = []; } h += campo(f); } }); if (buf.length) h += `<div class="fgrid">${buf.join('')}</div>`; return h; })()}
  </form><div class="mf">${extraBotoes}<button class="btn ghost" data-x>Cancelar</button><button class="btn" data-ok>${esc(botao)}</button></div></div>`;
  document.body.appendChild(ov);
  const fechar = () => ov.remove();
  ov.querySelectorAll('[data-x]').forEach(b => b.onclick = fechar);
  ov.addEventListener('mousedown', e => { if (e.target === ov) fechar(); });
  const form = ov.querySelector('form');
  ov.querySelector('[data-ok]').onclick = async () => {
    const out = {};
    for (const f of campos) {
      if (f.t === 'checks') out[f.k] = [...form.querySelectorAll(`[name="${f.k}"]:checked`)].map(x => x.value);
      else if (f.t === 'bool') out[f.k] = form.querySelector(`[name="${f.k}"]`).checked;
      else if (f.t === 'file') { const fi = form.querySelector(`[name="${f.k}"]`).files[0]; out[f.k] = fi ? await lerImagem(fi, f.max || 360) : (valores[f.k] || ''); }
      else if (f.t === 'number') out[f.k] = Number(form.querySelector(`[name="${f.k}"]`).value);
      else out[f.k] = form.querySelector(`[name="${f.k}"]`).value.trim();
    }
    let erro = false;
    campos.forEach(f => { const el = form.querySelector(`[data-f="${f.k}"]`); const vazio = f.req && (Array.isArray(out[f.k]) ? false : !out[f.k]); el.classList.toggle('err', vazio); if (vazio) erro = true; });
    if (erro) return;
    try { const r = await onSubmit(out); if (r !== false) { fechar(); render(); } } catch (e) { alert(e.message); }
  };
  setTimeout(() => form.querySelector('input,textarea,select')?.focus(), 30);
  return ov;
}
function lerImagem(file, max) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

/* ---------- formulários de domínio ---------- */
const consOpts = (soAtivos = true) => DB.consultores.filter(c => !soAtivos || c.ativo).map(c => ({ v: c.id, l: c.nome, h: av(c.id, 20) }));
function formIniciativa(projetoId, r = {}) {
  const p = prj(projetoId);
  abrirForm({
    titulo: r.id ? 'Editar iniciativa' : 'Nova iniciativa — ' + prjCli(p).nome,
    valores: { trimestre: trimKey(UI.semana), visivelCliente: true, donoId: p.responsavelId, status: 'ativa', ...r },
    nota: 'A iniciativa declara o <b>objetivo do trimestre</b>. Os marcos mensais e as tarefas semanais se vinculam a ela.',
    campos: [
      { k: 'titulo', l: 'Título da iniciativa', req: 1 },
      { k: 'objetivo', l: 'Objetivo do trimestre (o que precisa ocorrer)', t: 'textarea', req: 1, ph: 'Ex.: Política de remuneração variável aprovada pela diretoria e comunicada ao time até 15/12.' },
      { k: 'trimestre', l: 'Trimestre', t: 'select', half: 1, op: [-1, 0, 1, 2].map(n => { const k = trimKey(ymd(new Date(parseD(UI.semana).getFullYear(), parseD(UI.semana).getMonth() + 3 * n, 1))); return { v: k, l: trimLabel(k) }; }) },
      { k: 'dataAlvo', l: 'Data-alvo', t: 'date', half: 1, req: 1 },
      { k: 'donoId', l: 'Dono da iniciativa', t: 'select', half: 1, op: consOpts(), req: 1 },
      { k: 'status', l: 'Status', t: 'select', half: 1, op: [{ v: 'ativa', l: 'Ativa' }, { v: 'pausada', l: 'Pausada' }, { v: 'concluida', l: 'Concluída' }] },
      { k: 'visivelCliente', l: 'One-page', t: 'bool', txt: 'Exibir esta iniciativa no one-page do cliente' },
    ],
    onSubmit: v => invoke('gp.registro.salvar', { colecao: 'iniciativas', registro: { ...r, ...v, projetoId } }),
    extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('iniciativas','${r.id}',this)">Excluir</button>` : '',
  });
}
function formMarco(iniciativaId, r = {}) {
  const i = ini(iniciativaId);
  abrirForm({
    titulo: r.id ? 'Editar marco mensal' : 'Novo marco mensal',
    nota: `Iniciativa: <b>${esc(i.titulo)}</b><br>O marco é a <b>entrega verificável do mês</b>. Para mudar a data de um marco existente, use "Reprogramar" — assim o histórico é preservado.`,
    valores: { visivelCliente: true, ...r },
    campos: [
      { k: 'titulo', l: 'O que precisa ocorrer no mês (entrega verificável)', req: 1 },
      { k: 'dataAlvo', l: 'Data-alvo', t: 'date', req: 1, half: 1 },
      { k: 'visivelCliente', l: 'One-page', t: 'bool', txt: 'Exibir no one-page', half: 1 },
    ],
    onSubmit: v => {
      const reg = { ...r, ...v, iniciativaId, mes: mesKey(v.dataAlvo) };
      if (!r.id) Object.assign(reg, { status: 'aberto', concluidoEm: '', reprogramacoes: 0, historico: [], dataAlvoOriginal: v.dataAlvo });
      else if (r.dataAlvo !== v.dataAlvo) { reg.dataAlvo = r.dataAlvo; alert('A data não foi alterada. Use "Reprogramar" para registrar a mudança de data.'); }
      return invoke('gp.registro.salvar', { colecao: 'marcos', registro: reg });
    },
    extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('marcos','${r.id}',this)">Excluir</button>` : '',
  });
}
function formTarefa(marcoId, r = {}, naoPlanejada = false) {
  const m = mar(marcoId), i = ini(m.iniciativaId), p = prj(i.projetoId);
  const tiposOp = DB.tipos.filter(t => t.ativo).map(t => ({ v: t.id, l: `${t.nome}  ·  ${t.categoria}` }));
  const ov = abrirForm({
    titulo: r.id ? 'Editar tarefa' : naoPlanejada ? 'Tarefa não planejada' : 'Nova tarefa da semana',
    nota: `${esc(prjCli(p).sigla)} › ${esc(i.titulo)} › <b>${esc(m.titulo)}</b>${naoPlanejada ? '<br>Tarefa não planejada: entra no histórico, mas não no denominador da confiabilidade.' : ''}`,
    valores: { semana: UI.semana, responsavelId: i.donoId, porte: 'M', participantes: [], ...r },
    campos: [
      { k: 'tipoId', l: 'Tipo de tarefa', t: 'select', op: tiposOp, req: 1, vazio: 'Selecione…' },
      { k: 'titulo', l: 'Descrição da tarefa', req: 1, ph: 'Ex.: Reunião de alinhamento da política comercial com o diretor' },
      { k: 'semana', l: 'Semana', t: 'select', half: 1, op: [-1, 0, 1, 2, 3, 4].map(n => { const s = addDays(UI.semana, 7 * n); return { v: s, l: 'Semana ' + semanaLabel(s) }; }) },
      { k: 'porte', l: 'Porte', t: 'select', half: 1, op: Object.entries(DB.config.porte).map(([k, h]) => ({ v: k, l: `${k} — ${{ P: 'até 4h', M: '4 a 12h', G: '12 a 24h' }[k]}` })), help: 'Acima de G: quebre em mais tarefas.' },
      { k: 'responsavelId', l: 'Responsável (único)', t: 'select', half: 1, op: consOpts(), req: 1 },
      { k: 'modalidade', l: 'Modalidade', t: 'select', half: 1, op: Object.entries(MODALIDADES).map(([v, o]) => ({ v, l: o.l })), help: 'Só presencial conta como presença.' },
      { k: 'participantes', l: 'Participantes Hand (além do responsável)', t: 'checks', op: consOpts() },
    ],
    onSubmit: v => {
      if ((v.participantes || []).includes(v.responsavelId)) v.participantes = v.participantes.filter(x => x !== v.responsavelId);
      const reg = { ...r, ...v, marcoId };
      if (!r.id) Object.assign(reg, { status: 'planejada', comentario: '', resumoCliente: '', dataRealizada: '', impedimento: null, expurgo: null, reprogramacoes: 0, origemId: null, naoPlanejada, criadoPor: usuarioAtual()?.id });
      return invoke('gp.registro.salvar', { colecao: 'tarefas', registro: reg });
    },
    extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('tarefas','${r.id}',this)">Excluir</button>` : '',
  });
  const selT = ov.querySelector('[name=tipoId]'), tit = ov.querySelector('[name=titulo]'), mod = ov.querySelector('[name=modalidade]');
  if (!r.id) mod.value = 'interna';
  selT.onchange = () => { const t = tipo(selT.value); if (!t) return; if (!tit.value) tit.value = t.nome; mod.value = t.modalidade; };
}
async function excluir(colecao, id, btn) {
  if (!confirm('Confirmar exclusão? Esta ação fica registrada.')) return;
  try { await invoke('gp.registro.excluir', { colecao, id }); btn.closest('.ov')?.remove(); render(); toast('Excluído'); } catch (e) { alert(e.message); }
}
function formConcluir(t) {
  abrirForm({
    titulo: 'Concluir tarefa', botao: 'Concluir',
    nota: `<b>${esc(t.titulo)}</b>`,
    valores: { dataRealizada: t.dataRealizada || (t.semana <= hoje() && hoje() <= addDays(t.semana, 6) ? hoje() : addDays(t.semana, 4)), comentario: t.comentario, resumoCliente: t.resumoCliente },
    campos: [
      { k: 'comentario', l: 'Resultado da atividade (uso interno)', t: 'textarea', req: 1, ph: 'O que foi feito, o que foi decidido, próximos passos.' },
      { k: 'resumoCliente', l: 'Como aparece no one-page (opcional)', ph: 'Se vazio, o one-page usa a descrição da tarefa.', help: 'Texto curto, na linguagem do cliente.' },
      { k: 'dataRealizada', l: 'Data de realização', t: 'date', req: 1, half: 1 },
    ],
    onSubmit: v => invoke('gp.tarefa.concluir', { id: t.id, ...v }).then(() => toast('Tarefa concluída')),
  });
}
function formNaoConcluir(t) {
  const ov = abrirForm({
    titulo: 'Tarefa não concluída', botao: 'Registrar',
    nota: `<b>${esc(t.titulo)}</b><br>Demandas concorrentes (gestão ou cliente) geram pedido de <b>expurgo</b>, aprovado pelo gestor. Dependência do cliente <b>não</b> é expurgada, mas aparece no one-page.`,
    valores: { reprogramar: true },
    campos: [
      { k: 'origem', l: 'Origem do impedimento', t: 'select', req: 1, vazio: 'Selecione…', op: Object.entries(ORIGENS).map(([v, o]) => ({ v, l: o.l + (o.expurgavel ? '  — expurgável' : '') })) },
      { k: 'justificativa', l: 'Justificativa (uso interno)', t: 'textarea', req: 1 },
      { k: 'textoCliente', l: 'Como aparece no one-page (opcional)', ph: 'Ex.: Aguardando envio da base de vendas pelo TI.', help: 'Aparece em "Impeditivos" — lado cliente ou lado Hand, conforme a origem.' },
      { k: 'reprogramar', l: 'Reprogramação', t: 'bool', txt: `Reprogramar para a semana ${semanaLabel(addDays(t.semana, 7))} (contador ↻ ${(t.reprogramacoes || 0) + 1})` },
    ],
    onSubmit: v => invoke('gp.tarefa.naoConcluir', { id: t.id, ...v }).then(() => toast(v.reprogramar ? 'Registrado e reprogramado' : 'Registrado')),
  });
}
function formReprogMarco(m) {
  abrirForm({
    titulo: 'Reprogramar marco', botao: 'Reprogramar',
    nota: `<b>${esc(m.titulo)}</b><br>Data atual: ${fmtDMY(m.dataAlvo)} · reprogramações: ${m.reprogramacoes || 0}`,
    campos: [{ k: 'novaData', l: 'Nova data-alvo', t: 'date', req: 1 }, { k: 'motivo', l: 'Motivo', t: 'textarea', req: 1 }],
    onSubmit: v => invoke('gp.marco.reprogramar', { id: m.id, ...v }),
  });
}

/* ============================================================ VIEWS */
function vPainel() {
  const sem = semanaAtual(), semAnt = addDays(sem, -7), mes = mesKey(hoje());
  const ps = projetosAtivos();
  const confAnt = confiab(DB.tarefas.filter(t => t.semana === semAnt));
  const naMeta = ps.filter(p => presencasMes(p.id, mes).length >= DB.config.metaPresencaMes).length;
  const risco = DB.marcos.filter(m => { const p = prj(ini(m.iniciativaId)?.projetoId); return p?.status === 'ativo' && marcoEmRisco(m); });
  const pend = DB.tarefas.filter(t => t.expurgo?.status === 'pendente').length;
  const reprog3 = DB.tarefas.filter(t => t.status === 'planejada' && (t.reprogramacoes || 0) >= 3);
  const kpi = (v, l, c = '') => `<div class="kpi ${c}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  let h = `<div class="grid g5">
    ${kpi(ps.length, 'Projetos ativos', 'mid')}
    ${kpi(pct(confAnt.pct), `Confiabilidade · semana ${semanaLabel(semAnt)}`, confAnt.pct == null ? '' : confAnt.pct >= .85 ? 'grn' : confAnt.pct >= .7 ? 'az' : 'red')}
    ${kpi(`${naMeta}/${ps.length}`, `Projetos com presença na meta (${MESES_L[+mes.slice(5) - 1]})`, 'az')}
    ${kpi(risco.length, 'Marcos em risco (vencidos ou ↻≥2)', risco.length ? 'red' : 'grn')}
    ${kpi(pend, 'Expurgos aguardando aprovação', pend ? 'red' : '')}
  </div>
  <div class="note" style="margin-top:14px">Ritual: <b>sexta, 19h</b> — cada consultor fecha a semana em <i>Fechamento</i>. <b>Segunda</b> — reunião de planejamento: revisar alertas, aprovar expurgos e declarar as tarefas da semana. Pendências de fechamento podem ser resolvidas na própria reunião.</div>
  <div class="sec"><h2>Projetos</h2><span class="hint">Clique no projeto para abrir o planejamento</span></div><div class="grid g3">`;
  ps.forEach(p => {
    const c = prjCli(p), pres = presencasMes(p.id, mes).length, fp = farolPresenca(pres, mes);
    const cf = confiab(DB.tarefas.filter(t => t.projetoId === p.id && t.semana === semAnt));
    const tw = DB.tarefas.filter(t => t.projetoId === p.id && t.semana === UI.semana);
    const mr = marcosDoProjeto(p.id).filter(marcoEmRisco).length;
    const rp = DB.tarefas.filter(t => t.projetoId === p.id && t.status === 'planejada' && (t.reprogramacoes || 0) >= 2).length;
    const ug = ultimaParticipacaoGestor(p.id), dg = ug ? diasEntre(ug, hoje()) : null;
    const meta = DB.config.metaPresencaMes;
    h += `<div class="pcard" data-go-proj="${p.id}">
      <div class="hd">${logoTile(c)}<div style="min-width:0"><div class="nm">${esc(c.sigla)} · ${esc(c.nome)}</div><div class="small muted">${esc(p.frente)}</div><div style="margin-top:4px">${avs([p.responsavelId, ...p.consultores])}</div></div></div>
      <div class="stats">
        <div><b>${Array.from({ length: Math.max(meta, pres) }, (_, i) => `<span class="dot ${i < pres ? 'farol-' + fp : 'farol-n'}"></span>`).join(' ')}</b><span>Presença no mês ${pres}/${meta}</span></div>
        <div><b><span class="dot farol-${farolPct(cf.pct)}"></span> ${pct(cf.pct)}</b><span>Confiab. sem. anterior</span></div>
        <div><b>${tw.filter(t => t.status === 'concluida').length}/${tw.length}</b><span>Tarefas da semana</span></div>
      </div>
      <div class="alerts">${mr ? `<span class="chip r">${mr} marco(s) em risco</span>` : ''}${rp ? `<span class="chip y">${rp} tarefa(s) ↻≥2</span>` : ''}${p.responsavelId !== gestorId() && (dg == null || dg > 14) ? `<span class="chip">Gestor ausente há ${dg == null ? '—' : dg + ' dias'}</span>` : ''}${!mr && !rp ? '<span class="chip g">Sem alertas críticos</span>' : ''}</div>
    </div>`;
  });
  h += `</div>`;
  h += `<div class="grid g2" style="margin-top:22px"><div class="card"><h3>Marcos em risco</h3>${risco.length ? `<table class="t" style="margin-top:8px"><tr><th>Projeto</th><th>Marco</th><th>Data-alvo</th><th>↻</th></tr>${risco.map(m => { const i = ini(m.iniciativaId), c = prjCli(prj(i.projetoId)); return `<tr><td>${esc(c.sigla)}</td><td>${esc(m.titulo)}<div class="tiny muted">${esc(i.titulo)}</div></td><td>${fmtDM(m.dataAlvo)}</td><td>${m.reprogramacoes || 0}</td></tr>`; }).join('')}</table>` : '<div class="empty">Nenhum marco em risco.</div>'}</div>
  <div class="card"><h3>Tarefas reprogramadas 3 vezes ou mais</h3>${reprog3.length ? `<table class="t" style="margin-top:8px"><tr><th>Projeto</th><th>Tarefa</th><th>Resp.</th><th>↻</th></tr>${reprog3.map(t => `<tr><td>${esc(prjCli(prj(t.projetoId)).sigla)}</td><td>${esc(t.titulo)}</td><td>${av(t.responsavelId, 22)}</td><td>${reprogChip(t.reprogramacoes)}</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma tarefa crônica.</div>'}</div></div>`;
  return h;
}

function vPlanejamento() {
  const ps = projetosAtivos();
  if (!UI.projetoId || !prj(UI.projetoId)) UI.projetoId = ps[0]?.id;
  const p = prj(UI.projetoId);
  let h = `<div class="pchips">${ps.map(x => { const c = prjCli(x); return `<div class="pchip ${x.id === UI.projetoId ? 'on' : ''}" data-proj="${x.id}">${img(c.logo) ? `<img src="${img(c.logo)}">` : ''}<b>${esc(c.sigla)}</b></div>`; }).join('')}</div>`;
  if (!p) return h + '<div class="empty">Cadastre um projeto em Cadastros.</div>';
  const c = prjCli(p);
  // carga da semana
  const tw = DB.tarefas.filter(t => t.semana === UI.semana);
  const carga = {}; tw.forEach(t => { carga[t.responsavelId] = (carga[t.responsavelId] || 0) + horasPorte(t.porte); });
  h += `<div class="card" style="margin-bottom:16px"><div class="row"><div class="small muted">Carga planejada na semana ${semanaLabel(UI.semana)} (todas as frentes, em horas-porte):</div><div class="load">${DB.consultores.filter(x => x.ativo).map(x => `<span class="it">${av(x.id, 26)} ${esc(x.nome)} <b>${carga[x.id] || 0}h</b></span>`).join('')}</div></div></div>`;
  h += `<div class="row" style="margin-bottom:14px">${logoTile(c, 110, 58)}<div><h2>${esc(c.nome)}</h2><div class="small muted">${esc(p.frente)} · ${esc(c.segmento || '')}</div><div class="small">Responsável: ${av(p.responsavelId, 22)} ${esc(con(p.responsavelId)?.nome)} · Equipe: ${avs(p.consultores, 22)}</div></div><div style="flex:1"></div>
    <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-act="todasSem" ${UI.todasSemanas ? 'checked' : ''}> Mostrar tarefas de todas as semanas</label>
    <button class="btn" data-act="novaIni">+ Iniciativa</button></div>`;
  const inis = DB.iniciativas.filter(i => i.projetoId === p.id).sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || a.dataAlvo.localeCompare(b.dataAlvo));
  if (!inis.length) h += '<div class="empty">Nenhuma iniciativa cadastrada. Comece por <b>+ Iniciativa</b>: declare o objetivo do trimestre, depois os marcos mensais e, por fim, as tarefas da semana.</div>';
  inis.forEach(i => {
    const ms = DB.marcos.filter(m => m.iniciativaId === i.id).sort((a, b) => a.dataAlvo.localeCompare(b.dataAlvo));
    const done = ms.filter(m => m.status === 'concluido').length;
    h += `<div class="ini" style="${i.status !== 'ativa' ? 'opacity:.7;border-left-color:var(--gray)' : ''}"><div class="hd">
      <div style="flex:1;min-width:0"><div class="row" style="gap:8px"><span class="chip d">${esc(trimLabel(i.trimestre))}</span><h3 style="font-size:16px">${esc(i.titulo)}</h3>${i.status !== 'ativa' ? `<span class="chip">${esc(i.status)}</span>` : ''}${i.visivelCliente ? '' : '<span class="chip">oculta no one-page</span>'}</div>
      <div class="obj"><b>Objetivo do trimestre</b>${esc(i.objetivo)}</div></div>
      <div style="text-align:right;min-width:170px"><div class="small">Dono ${av(i.donoId, 24)}</div><div class="small muted">Alvo ${fmtDMY(i.dataAlvo)}</div><div class="small"><b>${done}/${ms.length}</b> marcos concluídos</div>
      <div style="margin-top:6px"><button class="ibtn" data-act="editIni" data-id="${i.id}">Editar</button><button class="btn sm ghost" data-act="novoMarco" data-id="${i.id}">+ Marco</button></div></div></div>`;
    if (!ms.length) h += `<div class="marco"><span class="small muted">Sem marcos mensais. Adicione o que precisa ocorrer em cada mês.</span></div>`;
    ms.forEach(m => {
      let ts = DB.tarefas.filter(t => t.marcoId === m.id);
      const total = ts.length;
      if (!UI.todasSemanas) ts = ts.filter(t => t.semana === UI.semana);
      ts.sort((a, b) => a.semana.localeCompare(b.semana));
      const atras = m.status !== 'concluido' && m.dataAlvo < hoje();
      h += `<div class="marco"><div class="mh"><span class="mes">${esc(mesLabel(m.mes))}</span><span class="tt">${esc(m.titulo)}</span>
        ${m.status === 'concluido' ? `<span class="chip g">concluído ${fmtDM(m.concluidoEm)}</span>` : atras ? '<span class="chip r">vencido</span>' : `<span class="chip">alvo ${fmtDM(m.dataAlvo)}</span>`}${reprogChip(m.reprogramacoes)}
        <span class="small muted">${total} tarefa(s) no total</span><span style="flex:1"></span>
        <button class="ibtn" data-act="editMarco" data-id="${m.id}">Editar</button>
        ${m.status === 'concluido' ? `<button class="ibtn" data-act="reabrirMarco" data-id="${m.id}">Reabrir</button>` : `<button class="ibtn" data-act="reprogMarco" data-id="${m.id}">Reprogramar</button><button class="ibtn" data-act="concluirMarco" data-id="${m.id}">Concluir</button>`}
        <button class="btn sm" data-act="novaTarefa" data-id="${m.id}">+ Tarefa</button></div>
        ${m.historico?.length ? `<div class="tiny muted" style="margin-top:4px">Histórico: ${m.historico.map(x => `${fmtDM(x.de)}→${fmtDM(x.para)} (${esc(x.motivo)})`).join(' · ')}</div>` : ''}
        <div class="tasks">${ts.map(tarefaRow).join('') || `<span class="tiny muted">${UI.todasSemanas ? 'Sem tarefas.' : 'Sem tarefas nesta semana.'}</span>`}</div></div>`;
    });
    h += `</div>`;
  });
  return h;
}
function tarefaRow(t, opts = {}) {
  const tp = tipo(t.tipoId), md = MODALIDADES[t.modalidade];
  return `<div class="task">${statusIc(t)}<div style="min-width:0"><div class="tt">${esc(t.titulo)} ${t.naoPlanejada ? '<span class="chip a">não planejada</span>' : ''}</div>
    <div class="meta"><span class="porte" title="Porte">${t.porte}</span>${opts.semProj ? '' : ''}<span class="chip">${esc(tp?.categoria || '')}</span><span class="chip ${md?.presenca ? 'b' : ''}" title="${esc(md?.l)}">${md?.ic} ${esc(md?.l.split(' (')[0])}</span>${UI.todasSemanas || opts.mostraSemana ? `<span class="chip">sem. ${fmtDM(t.semana)}</span>` : ''}${reprogChip(t.reprogramacoes)}${comGestor(t) && t.responsavelId !== gestorId() ? '<span class="chip d" title="Agenda com o gestor">c/ gestor</span>' : ''}${chipOrigem(t)}</div>
    ${t.comentario ? `<div class="cm">${esc(t.comentario)}</div>` : ''}${t.impedimento ? `<div class="cm" style="border-color:var(--red)">${esc(t.impedimento.justificativa)}</div>` : ''}</div>
    <div class="row" style="gap:6px;flex-wrap:nowrap">${avs([t.responsavelId, ...(t.participantes || [])], 24)}
    ${opts.fech ? (t.status === 'planejada' ? `<button class="btn sm ok" data-act="concluir" data-id="${t.id}">Concluir</button><button class="btn sm no" data-act="naoConcluir" data-id="${t.id}">Não concluída</button>` : `<button class="ibtn" data-act="reabrir" data-id="${t.id}">Desfazer</button>`) : `<button class="ibtn" data-act="editTarefa" data-id="${t.id}">Editar</button>`}</div></div>`;
}

function vFechamento() {
  const eu = usuarioAtual();
  if (UI.fechConsultor === null) UI.fechConsultor = (eu && eu.perfil !== 'gestor') ? eu.id : '';
  const sel = UI.fechConsultor;
  let ts = DB.tarefas.filter(t => t.semana === UI.semana && (!sel || t.responsavelId === sel));
  const abertas = ts.filter(t => t.status === 'planejada').length;
  const cf = confiab(ts);
  let h = `<div class="row" style="margin-bottom:16px"><div class="fld" style="min-width:240px"><label>Consultor</label><select data-act="fechCons"><option value="">Todos</option>${optList(DB.consultores.filter(c => c.ativo), sel)}</select></div>
    <div class="kpi" style="min-width:170px"><div class="v">${ts.length - abertas}/${ts.length}</div><div class="l">Tarefas com status registrado</div></div>
    <div class="kpi az" style="min-width:170px"><div class="v">${pct(cf.plan - cf.pend ? cf.feito / (cf.plan - cf.pend) : null)}</div><div class="l">Confiabilidade das tarefas já fechadas</div></div>
    <div style="flex:1"></div></div>`;
  if (abertas && UI.semana < semanaAtual()) h += `<div class="note warn" style="margin-bottom:14px">${abertas} tarefa(s) desta semana ainda sem status. Resolva no fechamento ou na reunião de segunda.</div>`;
  const porProj = {}; ts.forEach(t => (porProj[t.projetoId] = porProj[t.projetoId] || []).push(t));
  const ids = Object.keys(porProj).sort((a, b) => prjCli(prj(a)).sigla.localeCompare(prjCli(prj(b)).sigla));
  if (!ids.length) h += `<div class="empty">Nenhuma tarefa declarada para a semana ${semanaLabel(UI.semana)}${sel ? ' para este consultor' : ''}.</div>`;
  ids.forEach(pid => {
    const p = prj(pid), c = prjCli(p);
    h += `<div class="card" style="margin-bottom:14px"><div class="row" style="margin-bottom:10px">${logoTile(c, 80, 40)}<h3>${esc(c.sigla)} · ${esc(c.nome)}</h3><span style="flex:1"></span><button class="btn sm ghost" data-act="naoPlan" data-id="${pid}">+ Tarefa não planejada</button></div><div class="tasks">`;
    porProj[pid].forEach(t => { const m = mar(t.marcoId); h += `<div class="tiny muted" style="margin:2px 0 -2px 4px">${esc(ini(m?.iniciativaId)?.titulo || '')} › ${esc(m?.titulo || '')}</div>` + tarefaRow(t, { fech: true }); });
    h += `</div></div>`;
  });
  return h;
}

function vExtra() {
  const ex = DB.extras.filter(e => e.semana === UI.semana).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const tot = {}; ex.forEach(e => tot[e.consultorId] = (tot[e.consultorId] || 0) + e.horas);
  let h = `<div class="row" style="margin-bottom:14px"><div class="note" style="flex:1">Registre aqui as atividades fora dos projetos que consumiram tempo na semana. Elas alimentam o painel de <b>interferência</b> e não afetam a confiabilidade.</div><button class="btn" data-act="novoExtra">+ Registrar atividade</button></div>
  <div class="load" style="margin-bottom:14px">${DB.consultores.filter(c => c.ativo).map(c => `<span class="it">${av(c.id, 26)} ${esc(c.nome)} <b>${tot[c.id] || 0}h</b></span>`).join('')}</div>`;
  h += ex.length ? `<table class="t"><tr><th>Data</th><th>Consultor</th><th>Atividade</th><th>Solicitante</th><th>Projeto impactado</th><th>Horas</th><th></th></tr>${ex.map(e => `<tr><td>${fmtDM(e.data)}</td><td>${av(e.consultorId, 22)} ${esc(con(e.consultorId)?.nome)}</td><td>${esc(e.descricao)}</td><td>${esc(SOLICITANTES[e.solicitante] || '')}</td><td>${e.projetoAfetadoId ? esc(prjCli(prj(e.projetoAfetadoId)).sigla) : '—'}</td><td><b>${e.horas}h</b></td><td><button class="ibtn" data-act="editExtra" data-id="${e.id}">Editar</button></td></tr>`).join('')}</table>` : `<div class="empty">Nenhuma atividade extraprojeto na semana ${semanaLabel(UI.semana)}.</div>`;
  return h;
}
function formExtra(r = {}) {
  abrirForm({
    titulo: r.id ? 'Editar atividade extraprojeto' : 'Atividade extraprojeto',
    valores: { consultorId: usuarioAtual()?.id, data: UI.semana <= hoje() && hoje() <= addDays(UI.semana, 6) ? hoje() : UI.semana, horas: 2, ...r },
    campos: [
      { k: 'consultorId', l: 'Consultor', t: 'select', op: consOpts(), req: 1, half: 1 },
      { k: 'data', l: 'Data', t: 'date', req: 1, half: 1 },
      { k: 'descricao', l: 'Atividade', req: 1 },
      { k: 'solicitante', l: 'Solicitante', t: 'select', op: Object.entries(SOLICITANTES).map(([v, l]) => ({ v, l })), half: 1 },
      { k: 'horas', l: 'Horas gastas', t: 'number', step: '0.5', req: 1, half: 1 },
      { k: 'projetoAfetadoId', l: 'Projeto impactado (opcional)', t: 'select', vazio: '—', op: projetosAtivos().map(p => ({ v: p.id, l: prjCli(p).sigla + ' · ' + prjCli(p).nome })) },
    ],
    onSubmit: v => invoke('gp.registro.salvar', { colecao: 'extras', registro: { ...r, ...v, semana: semanaDe(v.data) } }),
    extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('extras','${r.id}',this)">Excluir</button>` : '',
  });
}

function vAprovacoes() {
  const pend = DB.tarefas.filter(t => t.expurgo?.status === 'pendente').sort((a, b) => a.semana.localeCompare(b.semana));
  const dec = DB.tarefas.filter(t => t.expurgo && t.expurgo.status !== 'pendente').sort((a, b) => (b.expurgo.decididoEm || '').localeCompare(a.expurgo.decididoEm || '')).slice(0, 60);
  const g = souGestor();
  const linha = (t, acoes) => `<tr><td>${fmtDM(t.semana)}</td><td><b>${esc(prjCli(prj(t.projetoId)).sigla)}</b></td><td>${esc(t.titulo)} <span class="porte">${t.porte}</span></td><td>${av(t.responsavelId, 22)} ${esc(con(t.responsavelId)?.nome)}</td><td>${esc(ORIGENS[t.impedimento?.origem]?.l || '')}</td><td>${esc(t.impedimento?.justificativa || '')}</td><td style="white-space:nowrap">${acoes}</td></tr>`;
  let h = `${g ? '' : '<div class="note warn" style="margin-bottom:12px">Somente o gestor aprova ou recusa expurgos. Você pode acompanhar a fila.</div>'}
  <div class="note" style="margin-bottom:14px">Expurgo aprovado retira a tarefa do cálculo de confiabilidade do consultor e do projeto, e a soma ao painel de <b>interferência</b>. Expurgos de tarefas sob sua responsabilidade ficam marcados como <b>autoaprovados</b>.</div>
  <div class="sec"><h2>Aguardando decisão (${pend.length})</h2></div>`;
  h += pend.length ? `<table class="t"><tr><th>Semana</th><th>Projeto</th><th>Tarefa</th><th>Responsável</th><th>Origem</th><th>Justificativa</th><th></th></tr>${pend.map(t => linha(t, `<button class="btn sm ok" data-act="aprovar" data-id="${t.id}" ${g ? '' : 'disabled'}>Aprovar</button> <button class="btn sm no" data-act="recusar" data-id="${t.id}" ${g ? '' : 'disabled'}>Recusar</button>`)).join('')}</table>` : '<div class="empty">Nenhum expurgo pendente.</div>';
  h += `<div class="sec"><h2>Decididos recentemente</h2></div>`;
  h += dec.length ? `<table class="t"><tr><th>Semana</th><th>Projeto</th><th>Tarefa</th><th>Responsável</th><th>Origem</th><th>Justificativa</th><th>Decisão</th></tr>${dec.map(t => linha(t, `${t.expurgo.status === 'aprovado' ? '<span class="chip g">aprovado</span>' : '<span class="chip r">recusado</span>'} ${t.expurgo.auto ? '<span class="chip y">autoaprovado</span>' : ''}<div class="tiny muted">${fmtDM(t.expurgo.decididoEm)}</div>`)).join('')}</table>` : '<div class="empty">Sem histórico.</div>';
  return h;
}

/* ---------- indicadores ---------- */
function barras(itens, max = 1, fmt = v => pct(v), cor = v => 'var(--cob)') {
  return `<div class="bars">${itens.map(it => `<div class="bar"><div title="${esc(it.l)}" style="display:flex;gap:6px;align-items:center;overflow:hidden;white-space:nowrap">${it.h || ''}${esc(it.l)}</div><div class="tr">${it.v == null ? '' : `<div class="fl" style="width:${Math.min(100, it.v / max * 100)}%;background:${cor(it.v)}"></div>`}</div><div class="vl">${it.v == null ? '—' : fmt(it.v)}</div></div>${it.sub ? `<div class="tiny muted" style="margin:-6px 0 0 160px">${it.sub}</div>` : ''}`).join('')}</div>`;
}
const corPct = v => v >= .85 ? 'var(--grn)' : v >= .7 ? 'var(--az)' : 'var(--red)';
function vIndicadores() {
  const fim = addDays(semanaAtual(), -7), N = UI.indN, sems = semanasAte(fim, N), ini_ = sems[0], fimD = addDays(fim, 6);
  const tsP = DB.tarefas.filter(t => t.semana >= ini_ && t.semana <= fim);
  const cons = DB.consultores.filter(c => c.ativo), ps = projetosAtivos();
  let h = `<div class="row" style="margin-bottom:6px"><div class="tabs" style="margin:0;border:0">${[4, 8, 12].map(n => `<button class="${N === n ? 'on' : ''}" data-act="indN" data-n="${n}">Últimas ${n} semanas</button>`).join('')}</div><span class="small muted">Período: ${fmtDMY(ini_)} a ${fmtDMY(addDays(fim, 4))} · somente semanas fechadas</span></div>`;
  h += `<div class="note" style="margin-bottom:6px"><b>Confiabilidade</b> = horas-porte concluídas ÷ horas-porte planejadas (P=${DB.config.porte.P}h, M=${DB.config.porte.M}h, G=${DB.config.porte.G}h). Excluídas: tarefas não planejadas e expurgos aprovados. <b>Avanço</b> = marcos concluídos até a data-alvo original ÷ marcos vencidos no período.</div>`;
  // confiabilidade
  h += `<div class="grid g2"><div class="card"><h3>Confiabilidade por consultor</h3><div style="margin-top:12px">${barras(cons.map(c => { const r = confiab(tsP.filter(t => t.responsavelId === c.id)); return { l: c.nome, h: av(c.id, 20), v: r.pct, sub: r.plan ? `${r.feito}h de ${r.plan}h · expurgado ${r.exp}h` : '' }; }), 1, pct, corPct)}</div></div>
  <div class="card"><h3>Confiabilidade por projeto</h3><div style="margin-top:12px">${barras(ps.map(p => { const r = confiab(tsP.filter(t => t.projetoId === p.id)); return { l: prjCli(p).sigla + ' · ' + prjCli(p).nome, v: r.pct }; }), 1, pct, corPct)}</div></div></div>`;
  // tendência
  const tend = sems.map(s => confiab(DB.tarefas.filter(t => t.semana === s)).pct);
  h += `<div class="card" style="margin-top:16px"><h3>Tendência semanal da equipe</h3><div class="cols">${sems.map((s, i) => `<div class="c"><div class="v">${pct(tend[i])}</div><div class="b" style="height:${(tend[i] || 0) * 100}%;background:${tend[i] == null ? 'var(--border)' : corPct(tend[i])}"></div><div class="x">${fmtDM(s)}</div></div>`).join('')}</div></div>`;
  // avanço
  h += `<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Avanço por projeto (marcos no prazo)</h3><div style="margin-top:12px">${barras(ps.map(p => { const a = avanco(marcosDoProjeto(p.id), ini_, fimD); return { l: prjCli(p).sigla + ' · ' + prjCli(p).nome, v: a.pct, sub: a.total ? `${a.noPrazo} no prazo · ${a.concl - a.noPrazo} com atraso · ${a.total - a.concl} em aberto` : 'sem marcos vencidos no período' }; }), 1, pct, corPct)}</div></div>
  <div class="card"><h3>Avanço por consultor (marcos das iniciativas que é dono)</h3><div style="margin-top:12px">${barras(cons.map(c => { const ms = DB.marcos.filter(m => ini(m.iniciativaId)?.donoId === c.id); const a = avanco(ms, ini_, fimD); return { l: c.nome, h: av(c.id, 20), v: a.pct, sub: a.total ? `${a.noPrazo}/${a.total} no prazo` : '' }; }), 1, pct, corPct)}</div></div></div>`;
  // presença
  const mes0 = mesKey(hoje()), meses = [addMes(mes0, -2), addMes(mes0, -1), mes0], meta = DB.config.metaPresencaMes;
  h += `<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Presença por projeto (meta ${meta}/mês)</h3><table class="t heat" style="margin-top:10px"><tr><th>Projeto</th>${meses.map(m => `<th style="text-align:center">${mesLabel(m)}</th>`).join('')}<th style="text-align:center">Online</th></tr>${ps.map(p => `<tr><td>${esc(prjCli(p).sigla)} · ${esc(prjCli(p).nome)}</td>${meses.map(m => { const q = presencasMes(p.id, m).length, f = farolPresenca(q, m); return `<td class="h"><span class="dot farol-${f}"></span> ${q}</td>`; }).join('')}<td class="h muted">${DB.tarefas.filter(t => t.projetoId === p.id && t.status === 'concluida' && t.modalidade === 'online' && mesKey(dataTarefa(t)) === mes0).length}</td></tr>`).join('')}</table><div class="tiny muted" style="margin-top:6px">Uma agenda com dois consultores conta uma presença. "Online" é interação, não presença (mês corrente).</div></div>`;
  // interferência
  const orig = { demanda_gestao: 'Demanda gestão (expurgo)', demanda_cliente: 'Demanda cliente (expurgo)', extra: 'Extraprojeto' };
  const corO = { demanda_gestao: '#0666C3', demanda_cliente: '#32B2D3', extra: '#172847' };
  const exP = DB.extras.filter(e => e.semana >= ini_ && e.semana <= fim);
  const inter = cons.map(c => { const o = { demanda_gestao: 0, demanda_cliente: 0, extra: 0 }; tsP.filter(t => t.responsavelId === c.id && expurgada(t)).forEach(t => o[t.impedimento.origem] += horasPorte(t.porte)); exP.filter(e => e.consultorId === c.id).forEach(e => o.extra += e.horas); return { c, o, tot: o.demanda_gestao + o.demanda_cliente + o.extra }; });
  const maxI = Math.max(1, ...inter.map(x => x.tot));
  h += `<div class="card"><h3>Interferência no período (horas)</h3><div class="bars" style="margin-top:12px">${inter.map(x => `<div class="bar"><div style="display:flex;gap:6px;align-items:center">${av(x.c.id, 20)}${esc(x.c.nome)}</div><div class="tr">${Object.keys(orig).map(k => `<div class="fl" title="${orig[k]}: ${x.o[k]}h" style="width:${x.o[k] / maxI * 100}%;background:${corO[k]}"></div>`).join('')}</div><div class="vl">${x.tot}h</div></div>`).join('')}</div>
  <div class="legend">${Object.keys(orig).map(k => `<span><i style="background:${corO[k]}"></i>${orig[k]}</span>`).join('')}</div>
  <div class="tiny muted" style="margin-top:8px">Extraprojeto por solicitante: ${Object.entries(SOLICITANTES).map(([k, l]) => `${l.split(' (')[0]} ${exP.filter(e => e.solicitante === k).reduce((s, e) => s + e.horas, 0)}h`).join(' · ')}</div></div></div>`;
  // acompanhamento do gestor
  const gid = gestorId(), gnome = con(gid)?.nome || 'gestor';
  const inter2 = tsP.filter(t => t.status === 'concluida' && ehInteracao(t));
  h += `<div class="sec"><h2>Acompanhamento do gestor — ${esc(gnome)}</h2><span class="hint">Onde você está presente e onde está ausente</span></div><div class="grid g2"><div class="card"><h3>Por projeto</h3><table class="t" style="margin-top:8px"><tr><th>Projeto</th><th>Interações c/ cliente</th><th>Com você</th><th>%</th><th>Última participação</th></tr>${ps.map(p => { const a = inter2.filter(t => t.projetoId === p.id), b = a.filter(comGestor), u = ultimaParticipacaoGestor(p.id), d = u ? diasEntre(u, hoje()) : null, proprio = p.responsavelId === gid; return `<tr style="${proprio ? 'opacity:.6' : ''}"><td>${esc(prjCli(p).sigla)}${proprio ? ' <span class="chip">conduzido por você</span>' : ''}</td><td>${a.length}</td><td>${b.length}</td><td>${a.length ? pct(b.length / a.length) : '—'}</td><td>${u ? fmtDM(u) : '—'} ${!proprio && (d == null || d > 14) ? '<span class="chip r">+14 dias</span>' : ''}</td></tr>`; }).join('')}</table></div>
  <div class="card"><h3>Por consultor</h3><div style="margin-top:12px">${barras(cons.filter(c => c.id !== gid).map(c => { const a = inter2.filter(t => t.responsavelId === c.id), b = a.filter(comGestor); const hs = tsP.filter(t => t.responsavelId === c.id && (t.participantes || []).includes(gid)).reduce((s, t) => s + horasPorte(t.porte), 0); return { l: c.nome, h: av(c.id, 20), v: a.length ? b.length / a.length : null, sub: `${b.length} de ${a.length} interações com cliente · ${hs}h-porte compartilhadas` }; }), 1, pct, () => 'var(--navy)')}</div></div></div>`;
  // reprogramações
  const rp = DB.tarefas.filter(t => t.status === 'planejada' && (t.reprogramacoes || 0) >= 2).sort((a, b) => b.reprogramacoes - a.reprogramacoes);
  h += `<div class="sec"><h2>Tarefas reprogramadas em aberto (↻ ≥ 2)</h2></div>${rp.length ? `<table class="t"><tr><th>Projeto</th><th>Tarefa</th><th>Responsável</th><th>Semana atual</th><th>↻</th></tr>${rp.map(t => `<tr><td>${esc(prjCli(prj(t.projetoId)).sigla)}</td><td>${esc(t.titulo)}</td><td>${av(t.responsavelId, 22)} ${esc(con(t.responsavelId)?.nome)}</td><td>${fmtDM(t.semana)}</td><td>${reprogChip(t.reprogramacoes)}</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma.</div>'}`;
  return h;
}

/* ---------- one-page ---------- */
function dadosOnePage(pid, sem) {
  const p = prj(pid), c = prjCli(p), mes = mesKey(addDays(sem, 2));
  const ts = DB.tarefas.filter(t => t.projetoId === pid && t.semana === sem);
  const prox = DB.tarefas.filter(t => t.projetoId === pid && t.semana === addDays(sem, 7) && ini(mar(t.marcoId)?.iniciativaId)?.visivelCliente !== false);
  const inis = DB.iniciativas.filter(i => i.projetoId === pid && i.visivelCliente && i.status !== 'pausada');
  const marcosMes = DB.marcos.filter(m => inis.some(i => i.id === m.iniciativaId) && m.mes === mes && m.visivelCliente !== false);
  const imp = ts.filter(t => t.status === 'nao_concluida' && t.impedimento);
  const op = DB.onepages.find(o => o.projetoId === pid && o.semana === sem) || {};
  return { p, c, mes, ts, prox, inis, marcosMes, op, concl: ts.filter(t => t.status === 'concluida'), impCli: imp.filter(t => ORIGENS[t.impedimento.origem].lado === 'cliente'), impHand: imp.filter(t => ORIGENS[t.impedimento.origem].lado === 'hand'), pres: presencasMes(pid, mes).length };
}
function htmlOnePage(pid, sem) {
  const d = dadosOnePage(pid, sem), meta = DB.config.metaPresencaMes;
  const rasc = DB.config.exigirAprovacaoOnePage && !d.op.aprovadoPor;
  const resp = con(d.p.responsavelId);
  const txtImp = t => esc(t.impedimento.textoCliente || (ORIGENS[t.impedimento.origem].lado === 'hand' ? 'Reprogramado pela equipe Hand.' : t.impedimento.justificativa));
  return `<div class="op-paper">${rasc ? '<div class="op-wm">RASCUNHO · AGUARDANDO APROVAÇÃO</div>' : ''}
  <div class="op-head"><img class="hl" src="${ASSETS.hand.logoFull}" alt="Hand"><div class="ttl"><div class="k">Status report semanal</div><h1>${esc(d.c.nome)}</h1></div><div class="cl">${img(d.c.logo) ? `<img src="${img(d.c.logo)}">` : esc(d.c.sigla)}</div></div><div class="op-band"></div>
  <div class="op-meta"><span>Projeto: <b>${esc(d.p.frente)}</b></span><span>Semana: <b>${semanaLabel(sem)}/${parseD(sem).getFullYear()}</b></span><span>Consultor(a) responsável: <b>${esc(resp?.nome || '')}</b></span><span>Equipe Hand: <b>${esc([...new Set(d.p.consultores)].map(i => con(i)?.nome).join(', '))}</b></span></div>
  <div class="op-body">
    <div class="op-kpis"><div><b>${d.concl.length} de ${d.ts.filter(t => !t.naoPlanejada || t.status === 'concluida').length}</b><span>Atividades da semana realizadas</span></div><div><b>${d.pres} de ${meta}</b><span>Encontros presenciais em ${MESES_L[+d.mes.slice(5) - 1]}</span></div><div><b>${d.marcosMes.filter(m => m.status === 'concluido').length} de ${d.marcosMes.length}</b><span>Entregas previstas para o mês concluídas</span></div></div>
    <div class="op-sec"><h3>Síntese dos avanços</h3>${d.inis.length ? d.inis.map(i => { const ms = DB.marcos.filter(m => m.iniciativaId === i.id && m.visivelCliente !== false); const dn = ms.filter(m => m.status === 'concluido').length; const mm = ms.find(m => m.mes === d.mes); return `<div class="op-ini"><div><div class="n">${esc(i.titulo)}</div><div class="o">${esc(i.objetivo)}</div>${mm ? `<div class="o">Entrega do mês: <b style="color:var(--mid)">${esc(mm.titulo)}</b> — ${mm.status === 'concluido' ? 'concluída' : 'prevista para ' + fmtDM(mm.dataAlvo)}</div>` : ''}</div><div><div class="op-prog"><i style="width:${ms.length ? dn / ms.length * 100 : 0}%"></i></div><div class="o" style="text-align:right">${dn}/${ms.length} entregas</div></div></div>`; }).join('') : '<div class="o muted">Sem iniciativas visíveis.</div>'}</div>
    <div class="op-2"><div class="op-sec"><h3>Realizado na semana</h3>${d.concl.length ? `<ul class="op-list">${d.concl.map(t => `<li>${esc(t.resumoCliente || t.titulo)}${MODALIDADES[t.modalidade].presenca ? ' <span class="muted">(presencial)</span>' : ''}</li>`).join('')}</ul>` : '<div class="op-text muted">Nenhuma atividade concluída.</div>'}</div>
    <div class="op-sec"><h3>Destaque da semana</h3><div class="op-text">${esc(d.op.destaque || '—')}</div></div></div>
    <div class="op-sec"><h3>Impeditivos ao avanço</h3><div class="op-2"><div class="op-box"><h4>Do lado do cliente</h4>${d.impCli.length ? `<ul class="op-list">${d.impCli.map(t => `<li><b>${esc(t.titulo)}:</b> ${txtImp(t)}</li>`).join('')}</ul>` : '<span class="muted">Nenhum.</span>'}</div><div class="op-box"><h4>Do lado da Hand</h4>${d.impHand.length ? `<ul class="op-list">${d.impHand.map(t => `<li><b>${esc(t.titulo)}:</b> ${txtImp(t)}</li>`).join('')}</ul>` : '<span class="muted">Nenhum.</span>'}</div></div>
    ${d.op.pedidoCliente ? `<div class="op-box" style="margin-top:8px;border-left:4px solid var(--az)"><h4>O que precisamos do cliente</h4><div class="op-text">${esc(d.op.pedidoCliente)}</div></div>` : ''}</div>
    <div class="op-2"><div class="op-sec"><h3>Agenda da próxima semana</h3>${d.prox.length ? `<ul class="op-list">${d.prox.map(t => `<li>${esc(t.titulo)}${MODALIDADES[t.modalidade].cliente ? ` <span class="muted">(${esc(MODALIDADES[t.modalidade].l.split(' (')[0].toLowerCase())})</span>` : ''}</li>`).join('')}</ul>` : '<div class="op-text muted">A definir na reunião de planejamento.</div>'}</div>
    <div class="op-sec"><h3>Próximos passos</h3><div class="op-text">${esc(d.op.proximosPassos || '—')}</div></div></div>
  </div>
  <div class="op-foot"><span>©2026 hand/™ All Rights Reserved · DOCUMENTO CONFIDENCIAL</span><span>Emitido em ${fmtDMY(hoje())}</span></div></div>`;
}
function vOnePage() {
  const ps = projetosAtivos();
  if (!UI.opProjetoId || !prj(UI.opProjetoId)) UI.opProjetoId = UI.projetoId && prj(UI.projetoId) ? UI.projetoId : ps[0]?.id;
  const pid = UI.opProjetoId; if (!pid) return '<div class="empty">Sem projetos.</div>';
  const d = dadosOnePage(pid, UI.semana), op = d.op, g = souGestor();
  const exig = DB.config.exigirAprovacaoOnePage;
  return `<div class="pchips">${ps.map(x => { const c = prjCli(x); return `<div class="pchip ${x.id === pid ? 'on' : ''}" data-op="${x.id}">${img(c.logo) ? `<img src="${img(c.logo)}">` : ''}<b>${esc(c.sigla)}</b></div>`; }).join('')}</div>
  <div class="op-wrap"><div class="card" style="position:sticky;top:80px"><h3>Semana ${semanaLabel(UI.semana)}</h3>
    <p class="small muted">O one-page é montado com o que foi registrado no planejamento e no fechamento. O consultor escreve apenas os campos abaixo.</p>
    <div class="fld"><label>Destaque da semana</label><textarea id="op-destaque" placeholder="Uma ou duas frases sobre o principal avanço.">${esc(op.destaque || '')}</textarea></div>
    <div class="fld" style="margin-top:10px"><label>O que precisamos do cliente (opcional)</label><textarea id="op-pedido" style="min-height:56px">${esc(op.pedidoCliente || '')}</textarea></div>
    <div class="fld" style="margin-top:10px"><label>Próximos passos</label><textarea id="op-prox" style="min-height:56px">${esc(op.proximosPassos || '')}</textarea></div>
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn ghost" data-act="opSalvar">Salvar textos</button>${exig ? `<button class="btn dark" data-act="opAprovar" ${g ? '' : 'disabled'}>${op.aprovadoPor ? 'Reaprovar' : 'Aprovar'}</button>` : ''}</div>
    <div style="margin-top:10px" class="small">${exig ? (op.aprovadoPor ? `<span class="chip g">Aprovado por ${esc(con(op.aprovadoPor)?.nome)} em ${fmtDM(op.aprovadoEm)}</span>` : '<span class="chip y">Aguardando aprovação do gestor</span>') : '<span class="chip">Aprovação desativada</span>'} ${op.enviadoEm ? `<span class="chip b">Enviado em ${fmtDM(op.enviadoEm)}</span>` : ''}</div>
    <hr style="border:0;border-top:1px solid var(--border);margin:14px 0">
    <div class="row" style="gap:8px"><button class="btn" data-act="opPdf">Gerar PDF</button><button class="btn ghost" data-act="opEnviado">Marcar como enviado</button></div>
    <p class="tiny muted" style="margin-top:8px">"Gerar PDF" abre a impressão do navegador: escolha <b>Salvar como PDF</b>, tamanho A4. Depois anexe ao e-mail do cliente.</p>
    ${!d.ts.length ? '<div class="note warn" style="margin-top:8px">Nenhuma tarefa registrada nesta semana para este projeto.</div>' : ''}
  </div><div style="overflow:auto">${htmlOnePage(pid, UI.semana)}</div></div>`;
}

/* ---------- cadastros ---------- */
function vCadastros() {
  const g = souGestor(), t = UI.cadTab;
  const tabs = [['clientes', 'Clientes'], ['projetos', 'Projetos'], ['consultores', 'Consultores'], ['tipos', 'Tipos de tarefa'], ['parametros', 'Parâmetros'], ['dados', 'Dados']];
  let h = `<div class="tabs">${tabs.map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="cadTab" data-k="${k}">${l}</button>`).join('')}</div>${g ? '' : '<div class="note warn" style="margin-bottom:12px">Cadastros e parâmetros são mantidos pelo gestor.</div>'}`;
  const dis = g ? '' : 'disabled';
  if (t === 'clientes') h += `<div class="row" style="margin-bottom:10px"><span style="flex:1"></span><button class="btn" data-act="novoCli" ${dis}>+ Cliente</button></div><table class="t"><tr><th>Logo</th><th>Sigla</th><th>Nome</th><th>Segmento</th><th>Projetos</th><th>Status</th><th></th></tr>${DB.clientes.map(c => `<tr><td>${logoTile(c, 90, 40)}</td><td><b>${esc(c.sigla)}</b></td><td>${esc(c.nome)}</td><td>${esc(c.segmento || '')}</td><td>${DB.projetos.filter(p => p.clienteId === c.id).length}</td><td>${c.ativo ? '<span class="chip g">ativo</span>' : '<span class="chip">inativo</span>'}</td><td><button class="ibtn" data-act="editCli" data-id="${c.id}" ${dis}>Editar</button></td></tr>`).join('')}</table>`;
  if (t === 'projetos') h += `<div class="row" style="margin-bottom:10px"><span class="small muted" style="flex:1">Um cliente pode ter vários projetos (frentes). Projetos encerrados ou pausados saem do painel e dos indicadores.</span><button class="btn" data-act="novoProj" ${dis}>+ Projeto</button></div><table class="t"><tr><th>Cliente</th><th>Frente</th><th>Nome</th><th>Responsável</th><th>Equipe</th><th>Início</th><th>Status</th><th></th></tr>${DB.projetos.map(p => `<tr><td><b>${esc(prjCli(p).sigla)}</b> ${esc(prjCli(p).nome)}</td><td>${esc(p.frente)}</td><td>${esc(p.nome)}</td><td>${av(p.responsavelId, 22)} ${esc(con(p.responsavelId)?.nome)}</td><td>${avs(p.consultores, 22)}</td><td>${fmtDMY(p.inicio)}</td><td><span class="chip ${p.status === 'ativo' ? 'g' : ''}">${esc(p.status)}</span></td><td><button class="ibtn" data-act="editProj" data-id="${p.id}" ${dis}>Editar</button></td></tr>`).join('')}</table>`;
  if (t === 'consultores') h += `<div class="row" style="margin-bottom:10px"><span class="small muted" style="flex:1">O e-mail é o login: só entra na ferramenta quem estiver cadastrado aqui como ativo.</span><button class="btn" data-act="novoCon" ${dis}>+ Consultor</button></div><table class="t"><tr><th></th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Projetos</th><th>Status</th><th></th></tr>${DB.consultores.map(c => `<tr><td>${av(c.id, 34)}</td><td><b>${esc(c.nome)}</b></td><td>${esc(c.email || '—')}</td><td>${c.perfil === 'gestor' ? '<span class="chip d">gestor</span>' : '<span class="chip">consultor</span>'}</td><td>${DB.projetos.filter(p => p.consultores.includes(c.id) && p.status === 'ativo').map(p => esc(prjCli(p).sigla)).join(', ')}</td><td>${c.ativo ? '<span class="chip g">ativo</span>' : '<span class="chip">inativo</span>'}</td><td><button class="ibtn" data-act="editCon" data-id="${c.id}" ${dis}>Editar</button></td></tr>`).join('')}</table>`;
  if (t === 'tipos') h += `<div class="row" style="margin-bottom:10px"><span class="small muted" style="flex:1">A categoria e a modalidade padrão orientam os indicadores de presença e interação.</span><button class="btn" data-act="novoTipo" ${dis}>+ Tipo</button></div><table class="t"><tr><th>Tipo</th><th>Categoria</th><th>Modalidade padrão</th><th>Uso</th><th></th></tr>${[...DB.tipos].sort((a, b) => CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria)).map(x => `<tr style="${x.ativo ? '' : 'opacity:.5'}"><td>${esc(x.nome)}</td><td>${esc(x.categoria)}</td><td>${esc(MODALIDADES[x.modalidade]?.l)}</td><td>${DB.tarefas.filter(t => t.tipoId === x.id).length}</td><td><button class="ibtn" data-act="editTipo" data-id="${x.id}" ${dis}>Editar</button></td></tr>`).join('')}</table>`;
  if (t === 'parametros') { const c = DB.config; h += `<div class="card" style="max-width:640px"><div class="fgrid">${['P', 'M', 'G'].map(k => `<div class="fld"><label>Horas equivalentes — porte ${k}</label><input type="number" id="cfg-${k}" value="${c.porte[k]}" ${dis}></div>`).join('')}<div class="fld"><label>Meta de presença por projeto/mês</label><input type="number" id="cfg-meta" value="${c.metaPresencaMes}" ${dis}></div></div>
    <div class="fld" style="margin-top:12px"><label style="font-family:var(--fb);font-weight:400;display:flex;gap:8px;align-items:center"><input type="checkbox" id="cfg-apr" ${c.exigirAprovacaoOnePage ? 'checked' : ''} ${dis}> Exigir aprovação do gestor antes do envio do one-page (recomendado nas primeiras 4 semanas)</label></div>
    <div class="fld" style="margin-top:12px"><label>Gestor (aprova expurgos e one-pages)</label><select id="cfg-gestor" ${dis}>${optList(DB.consultores.filter(x => x.perfil === 'gestor'), c.gestorId)}</select></div>
    <div style="margin-top:14px"><button class="btn" data-act="salvarCfg" ${dis}>Salvar parâmetros</button></div></div>`; }
  if (t === 'dados') h += `<div class="grid g2"><div class="card"><h3>Backup</h3><p class="small muted">Exporta a base inteira em JSON. Recomendado semanalmente, após a reunião de segunda. A importação substitui toda a base (somente gestor).</p><div class="row"><button class="btn" data-act="exportar">Exportar JSON</button><label class="btn ghost" style="cursor:pointer">Importar JSON<input type="file" accept=".json" data-act="importar" hidden ${dis}></label></div></div>
    <div class="card"><h3>Base de dados</h3><p class="small muted">${Persist.modo === 'local' ? 'Modo local: os dados ficam apenas neste navegador.' : 'Modo online: dados no Firebase, compartilhados em tempo real com a equipe.'} ${DB.demo ? '<b>Base com dados de demonstração.</b>' : ''}</p><div class="row"><button class="btn no" data-act="limparBase" ${dis}>Apagar movimentação (mantém cadastros)</button>${Persist.modo === 'local' ? `<button class="btn ghost" data-act="carregarDemo">Recarregar demonstração</button>` : ''}</div></div></div>`;
  return h;
}
function formCliente(r = {}) {
  abrirForm({ titulo: r.id ? 'Editar cliente' : 'Novo cliente', valores: { ativo: true, ...r }, campos: [{ k: 'sigla', l: 'Sigla', req: 1, half: 1 }, { k: 'nome', l: 'Nome', req: 1, half: 1 }, { k: 'segmento', l: 'Segmento' }, { k: 'logo', l: 'Logo (PNG/JPG)', t: 'file', max: 360 }, { k: 'ativo', l: 'Status', t: 'bool', txt: 'Ativo' }], onSubmit: v => invoke('gp.registro.salvar', { colecao: 'clientes', registro: { ...r, ...v, sigla: v.sigla.toUpperCase() } }), extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('clientes','${r.id}',this)">Excluir</button>` : '' });
}
function formProjeto(r = {}) {
  abrirForm({ titulo: r.id ? 'Editar projeto' : 'Novo projeto', valores: { frente: 'Gestão Compartilhada', nome: 'Gestão Compartilhada', status: 'ativo', consultores: [], inicio: hoje(), ...r }, campos: [
    { k: 'clienteId', l: 'Cliente', t: 'select', req: 1, vazio: 'Selecione…', op: DB.clientes.map(c => ({ v: c.id, l: c.sigla + ' · ' + c.nome })) },
    { k: 'frente', l: 'Frente', t: 'select', half: 1, op: FRENTES.map(f => ({ v: f, l: f })) }, { k: 'nome', l: 'Nome do projeto', half: 1, req: 1 },
    { k: 'responsavelId', l: 'Consultor responsável', t: 'select', req: 1, half: 1, op: consOpts() }, { k: 'status', l: 'Status', t: 'select', half: 1, op: [{ v: 'ativo', l: 'Ativo' }, { v: 'pausado', l: 'Pausado' }, { v: 'encerrado', l: 'Encerrado' }] },
    { k: 'inicio', l: 'Início', t: 'date', half: 1 }, { k: 'fim', l: 'Término previsto', t: 'date', half: 1 },
    { k: 'consultores', l: 'Equipe do projeto', t: 'checks', op: consOpts() }],
    onSubmit: v => { if (!v.consultores.includes(v.responsavelId)) v.consultores.unshift(v.responsavelId); return invoke('gp.registro.salvar', { colecao: 'projetos', registro: { ...r, ...v } }); },
    extraBotoes: r.id ? `<button class="btn no" style="margin-right:auto" onclick="excluir('projetos','${r.id}',this)">Excluir</button>` : '' });
}
function formConsultor(r = {}) {
  abrirForm({ titulo: r.id ? 'Editar consultor' : 'Novo consultor', valores: { perfil: 'consultor', ativo: true, ...r }, campos: [{ k: 'nome', l: 'Nome', req: 1, half: 1 }, { k: 'email', l: 'E-mail @handgc.com.br', t: 'email', half: 1 }, { k: 'perfil', l: 'Perfil', t: 'select', half: 1, op: [{ v: 'consultor', l: 'Consultor' }, { v: 'gestor', l: 'Gestor' }] }, { k: 'ativo', l: 'Status', t: 'bool', txt: 'Ativo', half: 1 }, { k: 'foto', l: 'Foto', t: 'file', max: 200 }], onSubmit: v => invoke('gp.registro.salvar', { colecao: 'consultores', registro: { ...r, ...v } }) });
}
function formTipo(r = {}) {
  abrirForm({ titulo: r.id ? 'Editar tipo de tarefa' : 'Novo tipo de tarefa', valores: { ativo: true, modalidade: 'interna', ...r }, campos: [{ k: 'nome', l: 'Nome', req: 1 }, { k: 'categoria', l: 'Categoria', t: 'select', half: 1, op: CATEGORIAS.map(c => ({ v: c, l: c })) }, { k: 'modalidade', l: 'Modalidade padrão', t: 'select', half: 1, op: Object.entries(MODALIDADES).map(([v, o]) => ({ v, l: o.l })) }, { k: 'ativo', l: 'Status', t: 'bool', txt: 'Ativo' }], onSubmit: v => invoke('gp.registro.salvar', { colecao: 'tipos', registro: { ...r, ...v } }) });
}

function vRegistro() {
  const L = DB.log.slice(0, 300);
  return `<div class="note" style="margin-bottom:12px">Registro de alterações: quem fez o quê e quando. Base para auditoria de expurgos e para a reunião de segunda.</div>` + (L.length ? `<table class="t"><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Item</th><th>Detalhe</th></tr>${L.map(l => { const d = new Date(l.quando); return `<tr><td class="small">${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}</td><td>${av(l.quem, 22)} ${esc(con(l.quem)?.nome || '')}</td><td>${esc(l.acao)}</td><td class="small muted">${esc(l.colecao)}</td><td>${esc(l.resumo)}</td></tr>`; }).join('')}</table>` : '<div class="empty">Nenhuma alteração registrada ainda.</div>');
}

/* ============================================================ shell */
const SEMANAL = ['planejamento', 'fechamento', 'extra', 'onepage'];
function render() {
  const app = document.getElementById('app');
  const pend = DB.tarefas.filter(t => t.expurgo?.status === 'pendente').length;
  const tabInfo = TABS.find(t => t[0] === UI.tab) || TABS[0];
  const views = { painel: vPainel, planejamento: vPlanejamento, fechamento: vFechamento, extra: vExtra, aprovacoes: vAprovacoes, indicadores: vIndicadores, onepage: vOnePage, cadastros: vCadastros, registro: vRegistro };
  const sc = window.scrollY;
  app.innerHTML = `<div class="app"><aside class="side"><div class="brand"><img src="${ASSETS.hand.logoFull}" alt="Hand"><small>Gestão de Projetos</small></div>
    <nav class="nav">${TABS.map(([k, l, ic]) => `<button class="${UI.tab === k ? 'on' : ''}" data-tab="${k}"><span class="ic">${ic}</span>${l}${k === 'aprovacoes' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('')}</nav>
    <div class="foot">©2026 hand/™<br>DOCUMENTO CONFIDENCIAL · v1</div></aside>
    <main class="main">${DB.demo ? `<div class="demo">Modo local com dados de demonstração (sem Firebase configurado). Os números são fictícios. <button class="btn sm dark" data-act="irDados">Opções de dados</button></div>` : ''}
    <div class="top"><h1>${tabInfo[1]}</h1><span class="sp"></span>
      ${SEMANAL.includes(UI.tab) ? `<div class="weeknav"><button data-act="semPrev" title="Semana anterior">◀</button><div class="lbl">Semana ${semanaLabel(UI.semana)}${UI.semana === semanaAtual() ? '<div class="now">semana atual</div>' : ''}</div><button data-act="semNext" title="Próxima semana">▶</button>${UI.semana !== semanaAtual() ? '<button data-act="semHoje">Hoje</button>' : ''}</div>` : ''}
      ${Persist.modo === 'local'
        ? `<div class="userbox">${av(usuarioAtual()?.id, 30)}<span>Usuário (modo local)</span><select data-act="user">${optList(DB.consultores.filter(c => c.ativo), usuarioAtual()?.id)}</select></div>`
        : `<div class="userbox">${av(usuarioAtual()?.id, 30)}<span><b style="color:var(--mid)">${esc(usuarioAtual()?.nome || '')}</b>${souGestor() ? ' · gestor' : ''}</span><button class="btn sm ghost" data-act="sair">Sair</button></div>`}</div>
    <div class="content">${views[UI.tab]()}</div></main></div>`;
  window.scrollTo(0, sc);
}

/* ---------- eventos ---------- */
document.addEventListener('click', async e => {
  const tb = e.target.closest('[data-tab]'); if (tb) { UI.tab = tb.dataset.tab; salvarUI(); window.scrollTo(0, 0); return render(); }
  const gp = e.target.closest('[data-go-proj]'); if (gp) { UI.projetoId = gp.dataset.goProj; UI.tab = 'planejamento'; salvarUI(); window.scrollTo(0, 0); return render(); }
  const pc = e.target.closest('[data-proj]'); if (pc) { UI.projetoId = pc.dataset.proj; return render(); }
  const oc = e.target.closest('[data-op]'); if (oc) { UI.opProjetoId = oc.dataset.op; return render(); }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.type === 'file' || b.type === 'checkbox') return;
  const id = b.dataset.id, A = b.dataset.act;
  const T = () => DB.tarefas.find(t => t.id === id);
  switch (A) {
    case 'semPrev': UI.semana = addDays(UI.semana, -7); return render();
    case 'semNext': UI.semana = addDays(UI.semana, 7); return render();
    case 'semHoje': UI.semana = semanaAtual(); return render();
    case 'novaIni': return formIniciativa(UI.projetoId);
    case 'editIni': return formIniciativa(ini(id).projetoId, ini(id));
    case 'novoMarco': return formMarco(id);
    case 'editMarco': return formMarco(mar(id).iniciativaId, mar(id));
    case 'reprogMarco': return formReprogMarco(mar(id));
    case 'concluirMarco': return acao('gp.marco.concluir', { id }, 'Marco concluído');
    case 'reabrirMarco': return acao('gp.marco.reabrir', { id });
    case 'novaTarefa': return formTarefa(id);
    case 'editTarefa': return formTarefa(T().marcoId, T());
    case 'concluir': return formConcluir(T());
    case 'naoConcluir': return formNaoConcluir(T());
    case 'reabrir': return acao('gp.tarefa.reabrir', { id }, 'Tarefa reaberta');
    case 'naoPlan': { const ms = DB.marcos.filter(m => ini(m.iniciativaId)?.projetoId === id && m.status !== 'concluido'); if (!ms.length) return alert('O projeto não tem marcos em aberto. Crie um marco no Planejamento.'); return abrirForm({ titulo: 'Tarefa não planejada — escolha o marco', campos: [{ k: 'm', l: 'Marco mensal ao qual a tarefa se vincula', t: 'select', op: ms.map(m => ({ v: m.id, l: `${mesLabel(m.mes)} · ${m.titulo} (${ini(m.iniciativaId).titulo})` })) }], botao: 'Continuar', onSubmit: v => { setTimeout(() => formTarefa(v.m, {}, true), 10); } }); }
    case 'novoExtra': return formExtra();
    case 'editExtra': return formExtra(DB.extras.find(x => x.id === id));
    case 'aprovar': return acao('gp.expurgo.decidir', { id, decisao: 'aprovado' }, 'Expurgo aprovado');
    case 'recusar': return acao('gp.expurgo.decidir', { id, decisao: 'recusado' }, 'Expurgo recusado');
    case 'indN': UI.indN = +b.dataset.n; return render();
    case 'cadTab': UI.cadTab = b.dataset.k; return render();
    case 'irDados': UI.tab = 'cadastros'; UI.cadTab = 'dados'; return render();
    case 'novoCli': return formCliente(); case 'editCli': return formCliente(cli(id));
    case 'novoProj': return formProjeto(); case 'editProj': return formProjeto(prj(id));
    case 'novoCon': return formConsultor(); case 'editCon': return formConsultor(con(id));
    case 'novoTipo': return formTipo(); case 'editTipo': return formTipo(tipo(id));
    case 'salvarCfg': return acao('gp.config.salvar', { porte: { P: +document.getElementById('cfg-P').value, M: +document.getElementById('cfg-M').value, G: +document.getElementById('cfg-G').value }, metaPresencaMes: +document.getElementById('cfg-meta').value, exigirAprovacaoOnePage: document.getElementById('cfg-apr').checked, gestorId: document.getElementById('cfg-gestor').value }, 'Parâmetros salvos');
    case 'exportar': { const bl = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `hand-gestao-projetos-${hoje()}.json`; a.click(); return; }
    case 'limparBase': { if (!confirm('Apagar TODAS as iniciativas, marcos, tarefas, extraprojetos, one-pages e o registro? Clientes, projetos, consultores e tipos são mantidos. Exporte um backup antes.')) return; if (prompt('Digite APAGAR para confirmar') !== 'APAGAR') return; return acao('gp.dados.limparMovimento', {}, 'Movimentação apagada'); }
    case 'sair': return window.sairApp && window.sairApp();
    case 'carregarDemo': if (!confirm('Substituir a base atual pela demonstração?')) return; await invoke('gp.dados.demo'); return render();
    case 'opSalvar': case 'opAprovar': case 'opEnviado': {
      const pl = { projetoId: UI.opProjetoId, semana: UI.semana, destaque: document.getElementById('op-destaque').value, pedidoCliente: document.getElementById('op-pedido').value, proximosPassos: document.getElementById('op-prox').value };
      if (A === 'opAprovar') pl.aprovar = true; if (A === 'opEnviado') pl.enviado = true;
      return acao('gp.onepage.salvar', pl, A === 'opAprovar' ? 'One-page aprovado' : A === 'opEnviado' ? 'Marcado como enviado' : 'Textos salvos');
    }
    case 'opPdf': {
      const pl = { projetoId: UI.opProjetoId, semana: UI.semana, destaque: document.getElementById('op-destaque').value, pedidoCliente: document.getElementById('op-pedido').value, proximosPassos: document.getElementById('op-prox').value };
      await invoke('gp.onepage.salvar', pl);
      const op = DB.onepages.find(o => o.projetoId === pl.projetoId && o.semana === pl.semana);
      if (DB.config.exigirAprovacaoOnePage && !op.aprovadoPor && !confirm('Este one-page ainda não foi aprovado pelo gestor e sairá com a marca "RASCUNHO". Gerar mesmo assim?')) return render();
      const pr = document.getElementById('print-root'); pr.innerHTML = htmlOnePage(pl.projetoId, pl.semana);
      const t0 = document.title; document.title = `StatusReport_${prjCli(prj(pl.projetoId)).sigla}_${pl.semana}`;
      document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); document.title = t0; render(); }, 60); return;
    }
  }
});
document.addEventListener('change', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'user') { UI.userId = b.value; UI.fechConsultor = null; salvarUI(); return render(); }
  if (b.dataset.act === 'fechCons') { UI.fechConsultor = b.value; return render(); }
  if (b.dataset.act === 'todasSem') { UI.todasSemanas = b.checked; return render(); }
  if (b.dataset.act === 'importar') { const f = b.files[0]; if (!f) return; try { const db = JSON.parse(await f.text()); if (!confirm('Substituir a base atual pelo arquivo importado?')) return; await invoke('gp.dados.substituir', { db }); toast('Base importada'); render(); } catch (err) { alert('Arquivo inválido: ' + err.message); } }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.ov')?.remove(); });

/* ---------- início ---------- */
let _renderPendente = false;
function agendarRender() {
  if (!DB) return;
  const a = document.activeElement;
  if (a && a.closest && a.closest('#app') && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) { _renderPendente = true; return; }
  clearTimeout(agendarRender.t); agendarRender.t = setTimeout(render, 120);
}
document.addEventListener('focusout', () => { if (_renderPendente) { _renderPendente = false; setTimeout(agendarRender, 50); } });
function iniciarLocal() {
  Persist = LocalPersist;
  DB = LocalPersist.load();
  if (!DB) { DB = seedDemo(); LocalPersist.commit(); }
  DB = normalizar(DB);
  if (!UI.userId || !con(UI.userId)) UI.userId = DB.config.gestorId;
  render();
}
