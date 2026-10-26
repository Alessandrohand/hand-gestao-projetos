/* ============================================================
   Gestão de Projetos Hand — camada de dados (v1)
   Toda leitura/escrita passa por invoke(slug, payload).
   Hoje: adaptador local (navegador). Próximo passo: trocar o
   adaptador por chamadas ao backend (Supabase / HandHub) sem
   mexer nas telas.
   ============================================================ */
const APP_SLUG = 'gp';
const STORE_KEY = 'hand.gp.v1';

/* ---------- utilidades de data ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
const hoje = () => ymd(new Date());
const semanaAtual = () => ymd(mondayOf(new Date()));
const semanaDe = s => ymd(mondayOf(parseD(s)));
const fmtDM = s => { if (!s) return '—'; const d = parseD(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const fmtDMY = s => { if (!s) return '—'; const d = parseD(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const semanaLabel = s => `${fmtDM(s)} a ${fmtDM(addDays(s, 4))}`;
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesKey = s => s.slice(0, 7);
const mesLabel = k => { const [y, m] = k.split('-'); return `${MESES[+m - 1]}/${y.slice(2)}`; };
const addMes = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const trimKey = s => { const d = parseD(s); return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`; };
const trimLabel = k => { const [y, t] = k.split('-T'); return `${t}º tri/${y}`; };
const diasEntre = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- domínio: listas fixas ---------- */
const FRENTES = ['Gestão Compartilhada', 'M&A', 'Controladoria', 'Pessoas & Cultura', 'Melhoria Contínua', 'Marketing & Vendas', 'Consultoria', 'Tributário', 'Treinamentos', 'Dados e Tecnologia'];
const CATEGORIAS = ['Interação com cliente', 'Imersão', 'Produção analítica', 'Produção de entregável', 'Capacitação', 'Gestão do projeto'];
const MODALIDADES = {
  presencial_cliente: { l: 'Presencial no cliente', presenca: true, cliente: true, ic: '◉' },
  presencial_hand: { l: 'Presencial na Hand (com cliente)', presenca: true, cliente: true, ic: '◎' },
  online: { l: 'Online com cliente', presenca: false, cliente: true, ic: '◌' },
  interna: { l: 'Interna (sem cliente)', presenca: false, cliente: false, ic: '·' },
};
const ORIGENS = {
  demanda_gestao: { l: 'Demanda da gestão Hand (concorrente)', expurgavel: true, lado: 'hand', cor: '#0666C3' },
  demanda_cliente: { l: 'Demanda nova do cliente (concorrente)', expurgavel: true, lado: 'cliente', cor: '#32B2D3' },
  dependencia_cliente: { l: 'Dependência do cliente (dados, agenda, aprovação)', expurgavel: false, lado: 'cliente', cor: '#91918F' },
  hand_interno: { l: 'Capacidade ou priorização da equipe Hand', expurgavel: false, lado: 'hand', cor: '#172847' },
};
const SOLICITANTES = { gestao: 'Gestão Hand', comercial: 'Comercial Hand (propostas, prospecção)', cliente: 'Cliente (fora do escopo)', interno: 'Interno (treinamento, QA, administrativo)', outro: 'Outro' };

/* ---------- semente: cadastros reais ---------- */
function seedBase() {
  const C = (nome, email, perfil, foto) => ({ id: uuid(), nome, email, perfil, foto, ativo: true });
  const ale = C('Alessandro', 'alessandro.oliveira@handgc.com.br', 'gestor', 'asset:alessandro');
  const ber = C('Bernardo', '', 'consultor', 'asset:bernardo');
  const jul = C('Júlia', '', 'consultor', 'asset:julia');
  const aur = C('Áureo', '', 'consultor', 'asset:aureo');
  const cli = [
    ['AV', 'Avec', 'Distribuidora de alimentos', 'av', [ber, aur]],
    ['CD', 'Conduscamp', 'Distribuidora de cabos elétricos', 'cd', [jul]],
    ['DM', 'Dismotor', 'Revenda de motores WEG', 'dm', [ber]],
    ['HG', 'Hidrogood', 'Hidroponia, estufas e fertilizantes', 'hg', [jul]],
    ['RC', 'Rivicci', 'Rede de restaurantes de alta gastronomia', 'rc', [jul]],
    ['FB', 'Flamboiã', 'Indústria de proteína animal (frangos)', 'fb', [ber]],
    ['SCT', 'Scitech', 'Equipamentos cirúrgicos minimamente invasivos', 'sct', [ale]],
    ['LP', 'Life Biological e Pragas.com', 'Pesquisa e produtos biodefensivos', 'lp', [jul]],
    ['JN', 'Jonasi', 'Indústria de sacolas plásticas', 'jn', [ber]],
  ];
  const clientes = [], projetos = [];
  cli.forEach(([sigla, nome, segmento, logo, cons]) => {
    const c = { id: uuid(), sigla, nome, segmento, logo: 'asset:' + logo, ativo: true };
    clientes.push(c);
    projetos.push({ id: uuid(), clienteId: c.id, frente: 'Gestão Compartilhada', nome: 'Gestão Compartilhada', responsavelId: cons[0].id, consultores: cons.map(x => x.id), inicio: '2026-01-01', fim: '', status: 'ativo' });
  });
  const T = (nome, categoria, modalidade) => ({ id: uuid(), nome, categoria, modalidade, ativo: true });
  const tipos = [
    T('Reunião de alinhamento com o cliente', 'Interação com cliente', 'presencial_cliente'),
    T('Reunião de apresentação de resultados', 'Interação com cliente', 'presencial_cliente'),
    T('Comitê / reunião de conselho', 'Interação com cliente', 'presencial_hand'),
    T('Entrevistas individuais (diagnóstico)', 'Interação com cliente', 'presencial_cliente'),
    T('Workshop / dinâmica com o time do cliente', 'Interação com cliente', 'presencial_cliente'),
    T('Validação de entregável com o cliente', 'Interação com cliente', 'online'),
    T('Visita externa com o cliente', 'Interação com cliente', 'presencial_cliente'),
    T('Acompanhamento de colaboradores (shadowing)', 'Imersão', 'presencial_cliente'),
    T('Condução assistida de ritual do cliente', 'Imersão', 'presencial_cliente'),
    T('Acompanhamento de implantação', 'Imersão', 'presencial_cliente'),
    T('Extração de dados', 'Produção analítica', 'interna'),
    T('Análise de cenários', 'Produção analítica', 'interna'),
    T('Consolidação de análises', 'Produção analítica', 'interna'),
    T('Pesquisa interna', 'Produção analítica', 'interna'),
    T('Pesquisa externa / de mercado', 'Produção analítica', 'interna'),
    T('Modelagem de indicadores (KPIs)', 'Produção analítica', 'interna'),
    T('Mapeamento de processos (As-Is / To-Be)', 'Produção analítica', 'interna'),
    T('Elaboração de apresentação', 'Produção de entregável', 'interna'),
    T('Documento de gestão (POP, política, manual)', 'Produção de entregável', 'interna'),
    T('Modelagem de remuneração', 'Produção de entregável', 'interna'),
    T('Plano de ação / priorização', 'Produção de entregável', 'interna'),
    T('Construção de dashboard', 'Produção de entregável', 'interna'),
    T('Treinamento do time do cliente', 'Capacitação', 'presencial_cliente'),
    T('Elaboração de material de treinamento', 'Capacitação', 'interna'),
    T('Preparação de pauta', 'Gestão do projeto', 'interna'),
    T('Ata e registro de decisões', 'Gestão do projeto', 'interna'),
    T('Follow-up de pendências do cliente', 'Gestão do projeto', 'online'),
    T('Revisão interna de entregável (peer review)', 'Gestão do projeto', 'interna'),
  ];
  return {
    versao: 1, demo: false,
    config: { porte: { P: 4, M: 8, G: 18 }, metaPresencaMes: 3, exigirAprovacaoOnePage: true, gestorId: ale.id },
    consultores: [ale, ber, jul, aur], clientes, projetos, tipos,
    iniciativas: [], marcos: [], tarefas: [], extras: [], onepages: [], log: [],
  };
}

/* ---------- semente: dados de demonstração ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedDemo() {
  const db = seedBase(); db.demo = true;
  const R = rng(20261026), pick = a => a[Math.floor(R() * a.length)];
  const INI = {
    AV: ['Estruturação da rotina comercial', 'Remuneração variável da equipe de vendas'],
    CD: ['Segmentação da carteira de clientes', 'Implantação do funil comercial no CRM'],
    DM: ['Modelo de metas por vendedor', 'Plano de mercado por região'],
    HG: ['Diagnóstico de maturidade comercial', 'Estruturação do canal de revendas'],
    RC: ['Rituais de gestão das unidades', 'Indicadores de desempenho por restaurante'],
    FB: ['Política comercial e de preços', 'Estruturação da equipe de vendas'],
    SCT: ['Estruturação da área comercial hospitalar', 'Plano de expansão de mercado'],
    LP: ['Estratégia de canais (distribuidores)', 'Modelo de remuneração comercial'],
    JN: ['Revisão da política de descontos', 'Rotina de gestão do funil B2B'],
  };
  const sem0 = semanaAtual(), mes0 = mesKey(sem0), tri = trimKey(sem0);
  const fimTri = (() => { const d = parseD(sem0); const m = Math.floor(d.getMonth() / 3) * 3 + 3; return ymd(new Date(d.getFullYear(), m, 0)); })();
  const ultDia = k => { const [y, m] = k.split('-').map(Number); return ymd(new Date(y, m, 0)); };
  const MARCOS = [['Diagnóstico concluído e validado com o cliente', -1], ['Modelo proposto e aprovado pela diretoria', 0], ['Implantação iniciada e primeiro ciclo acompanhado', 1]];
  const gestor = db.config.gestorId;
  db.projetos.forEach(p => {
    const c = db.clientes.find(x => x.id === p.clienteId);
    INI[c.sigla].forEach((titulo, ii) => {
      const dono = p.consultores[ii % p.consultores.length];
      const ini = { id: uuid(), projetoId: p.id, titulo, trimestre: tri, objetivo: `Até ${fmtDMY(fimTri)}: ${titulo.toLowerCase()} desenhado, aprovado e em operação, com indicadores de acompanhamento definidos.`, dataAlvo: fimTri, donoId: dono, status: 'ativa', visivelCliente: true };
      db.iniciativas.push(ini);
      MARCOS.forEach(([mt, off], mi) => {
        const mes = addMes(mes0, off), alvo = ultDia(mes);
        const concl = off < 0 && R() > .25;
        const m = { id: uuid(), iniciativaId: ini.id, titulo: mt, mes, dataAlvo: alvo, dataAlvoOriginal: alvo, status: concl ? 'concluido' : 'aberto', concluidoEm: concl ? addDays(alvo, -Math.floor(R() * 6)) : '', reprogramacoes: 0, historico: [], visivelCliente: true };
        if (off < 0 && !concl && R() > .5) { m.reprogramacoes = 1; m.dataAlvo = addDays(alvo, 14); m.historico.push({ de: alvo, para: m.dataAlvo, motivo: 'Base de dados do cliente entregue com atraso', em: addDays(alvo, -3) }); }
        db.marcos.push(m);
        // tarefas: últimas 4 semanas + semana atual, ligadas ao marco do mês corrente/anterior
        for (let w = -4; w <= 0; w++) {
          const sem = addDays(sem0, 7 * w);
          const mesSem = mesKey(addDays(sem, 2));
          if (mesSem !== mes && !(off === 0 && mesSem > mes)) continue;
          const n = R() < .3 ? 0 : (R() < .8 ? 1 : 2);
          for (let k = 0; k < n; k++) {
            const tipo = pick(db.tipos);
            const resp = pick(p.consultores);
            const parts = [];
            if (p.consultores.length > 1 && R() > .6) parts.push(p.consultores.find(x => x !== resp));
            if (resp !== gestor && MODALIDADES[tipo.modalidade].cliente && R() > .55) parts.push(gestor);
            const t = { id: uuid(), marcoId: m.id, projetoId: p.id, titulo: tipo.nome, tipoId: tipo.id, porte: pick(['P', 'P', 'M', 'M', 'G']), semana: sem, responsavelId: resp, participantes: parts, modalidade: tipo.modalidade, naoPlanejada: false, status: 'planejada', comentario: '', resumoCliente: '', dataRealizada: '', impedimento: null, expurgo: null, reprogramacoes: 0, origemId: null, criadoPor: gestor };
            if (w < 0) {
              const r = R();
              if (r < .72) { t.status = 'concluida'; t.dataRealizada = addDays(sem, Math.floor(R() * 5)); t.comentario = pick(['Realizado conforme planejado; decisões registradas em ata.', 'Concluído; cliente validou a proposta com pequenos ajustes.', 'Entregue. Próximo passo é a validação com a diretoria.', 'Feito; dados consolidados e enviados ao time.']); t.resumoCliente = ''; }
              else {
                t.status = 'nao_concluida';
                const o = pick(['demanda_gestao', 'demanda_cliente', 'dependencia_cliente', 'dependencia_cliente', 'hand_interno']);
                t.impedimento = { origem: o, justificativa: { demanda_gestao: 'Deslocado para apoiar proposta comercial urgente da Hand.', demanda_cliente: 'Cliente solicitou análise emergencial de margem fora do plano.', dependencia_cliente: 'Aguardando extração da base de vendas pelo TI do cliente.', hand_interno: 'Consultor alocado em outra frente na semana.' }[o], textoCliente: { demanda_cliente: 'Priorizada a análise emergencial de margem solicitada pela diretoria.', dependencia_cliente: 'Aguardando envio da base de vendas pelo time de TI.', hand_interno: 'Reprogramado pela equipe Hand para a próxima semana.', demanda_gestao: 'Reprogramado pela equipe Hand para a próxima semana.' }[o] };
                if (ORIGENS[o].expurgavel) t.expurgo = { status: w < -1 ? 'aprovado' : 'pendente', decididoPor: w < -1 ? gestor : '', decididoEm: w < -1 ? addDays(sem, 7) : '', auto: resp === gestor };
              }
            }
            db.tarefas.push(t);
          }
        }
      });
    });
  });
  // reprogramações encadeadas (exemplo)
  db.tarefas.filter(t => t.status === 'nao_concluida' && t.semana === addDays(sem0, -7)).slice(0, 6).forEach((t, i) => {
    db.tarefas.push({ ...t, id: uuid(), semana: sem0, status: 'planejada', comentario: '', impedimento: null, expurgo: null, dataRealizada: '', reprogramacoes: 1 + (i % 3), origemId: t.id });
  });
  // extraprojeto
  const solic = Object.keys(SOLICITANTES);
  for (let w = -4; w <= 0; w++) db.consultores.forEach(c => {
    if (R() > .45) db.extras.push({ id: uuid(), consultorId: c.id, semana: addDays(sem0, 7 * w), data: addDays(sem0, 7 * w + 2), descricao: pick(['Apoio em proposta comercial', 'Reunião interna de pilar', 'Treinamento interno', 'Apoio a projeto especial', 'Revisão de QA']), solicitante: pick(solic), horas: pick([2, 3, 4, 6, 8]), projetoAfetadoId: R() > .5 ? pick(db.projetos).id : '' });
  });
  return db;
}

/* ---------- persistência ----------
   O adaptador ativo fica em Persist. Modo local (sem Firebase configurado)
   grava tudo no navegador; modo online (js/app.js) grava registro a registro
   no Firestore e recebe as alterações dos colegas em tempo real. */
let DB = null;
const LocalPersist = {
  modo: 'local',
  load() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  async commit() { try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) { } },
};
let Persist = LocalPersist;

/* ---------- handlers: (payload, context) -> resultado ---------- */
const COLECOES = ['consultores', 'clientes', 'projetos', 'tipos', 'iniciativas', 'marcos', 'tarefas', 'extras', 'onepages'];
const COLECOES_GESTOR = ['consultores', 'clientes', 'projetos', 'tipos'];
function logar(ctx, acao, colecao, id, resumo) {
  const e = { id: uuid(), quando: new Date().toISOString(), quem: ctx.user?.id || '', acao, colecao, registroId: id || '', resumo: resumo || '' };
  ctx.db.log.unshift(e); if (ctx.db.log.length > 300) ctx.db.log.length = 300;
  ctx.touch('log', e);
}
const emailKey = e => String(e || '').trim().toLowerCase();
function autorizacaoDe(c) { return { id: emailKey(c.email), email: emailKey(c.email), perfil: c.perfil, ativo: !!c.ativo, consultorId: c.id }; }
const VALID = {
  tarefas: r => { if (!r.marcoId) return 'A tarefa precisa estar vinculada a um marco mensal.'; if (!r.titulo) return 'Informe o título.'; if (!['P', 'M', 'G'].includes(r.porte)) return 'Informe o porte.'; if (!r.responsavelId) return 'Informe o responsável.'; if (!r.semana) return 'Informe a semana.'; },
  marcos: r => { if (!r.iniciativaId) return 'O marco precisa estar vinculado a uma iniciativa.'; if (!r.titulo || !r.dataAlvo) return 'Informe título e data-alvo.'; },
  iniciativas: r => { if (!r.projetoId) return 'A iniciativa precisa estar vinculada a um projeto.'; if (!r.titulo || !r.objetivo || !r.donoId) return 'Informe título, objetivo trimestral e dono.'; },
  projetos: r => { if (!r.clienteId || !r.responsavelId) return 'Informe cliente e responsável.'; },
  clientes: r => { if (!r.sigla || !r.nome) return 'Informe sigla e nome.'; },
  consultores: r => { if (!r.nome) return 'Informe o nome.'; if (Persist.modo !== 'local' && !r.email) return 'Informe o e-mail: ele é usado no login.'; },
  extras: r => { if (!r.consultorId || !r.descricao || !(r.horas > 0)) return 'Informe consultor, descrição e horas.'; },
};
const exigeGestor = ctx => { if (ctx.user?.perfil !== 'gestor') throw new Error('Ação restrita ao gestor.'); };
const Handlers = {
  'gp.registro.salvar': ({ colecao, registro }, ctx) => {
    if (!COLECOES.includes(colecao)) throw new Error('Coleção inválida');
    if (COLECOES_GESTOR.includes(colecao)) exigeGestor(ctx);
    if (colecao === 'tarefas') { const m = ctx.db.marcos.find(x => x.id === registro.marcoId); const i = m && ctx.db.iniciativas.find(x => x.id === m.iniciativaId); registro.projetoId = i ? i.projetoId : registro.projetoId; }
    if (colecao === 'consultores' && registro.email) registro.email = emailKey(registro.email);
    const e = VALID[colecao] && VALID[colecao](registro); if (e) throw new Error(e);
    const arr = ctx.db[colecao];
    let rec, antes = null;
    const i = registro.id ? arr.findIndex(x => x.id === registro.id) : -1;
    if (i >= 0) { antes = arr[i]; rec = arr[i] = { ...arr[i], ...registro }; logar(ctx, 'editou', colecao, rec.id, rec.titulo || rec.nome || rec.descricao || ''); }
    else { rec = { ...registro, id: registro.id || uuid() }; arr.push(rec); logar(ctx, 'criou', colecao, rec.id, rec.titulo || rec.nome || rec.descricao || ''); }
    ctx.touch(colecao, rec);
    if (colecao === 'consultores') {
      if (antes?.email && emailKey(antes.email) !== rec.email) ctx.remove('autorizados', emailKey(antes.email));
      if (rec.email) ctx.touch('autorizados', autorizacaoDe(rec));
    }
    return rec;
  },
  'gp.registro.excluir': ({ colecao, id }, ctx) => {
    const db = ctx.db;
    if (COLECOES_GESTOR.includes(colecao)) exigeGestor(ctx);
    if (colecao === 'iniciativas' && db.marcos.some(m => m.iniciativaId === id)) throw new Error('Exclua antes os marcos desta iniciativa.');
    if (colecao === 'marcos' && db.tarefas.some(t => t.marcoId === id)) throw new Error('Exclua ou mova antes as tarefas deste marco.');
    if (colecao === 'projetos' && db.iniciativas.some(i => i.projetoId === id)) throw new Error('Projeto com iniciativas: altere o status para encerrado em vez de excluir.');
    if (colecao === 'clientes' && db.projetos.some(p => p.clienteId === id)) throw new Error('Cliente com projetos: inative em vez de excluir.');
    if (colecao === 'consultores') throw new Error('Consultores não são excluídos: marque como inativo.');
    const r = db[colecao].find(x => x.id === id);
    db[colecao] = db[colecao].filter(x => x.id !== id);
    ctx.remove(colecao, id);
    logar(ctx, 'excluiu', colecao, id, r ? (r.titulo || r.nome || r.descricao || '') : ''); return { ok: true };
  },
  'gp.tarefa.concluir': ({ id, comentario, resumoCliente, dataRealizada }, ctx) => {
    if (!comentario || comentario.trim().length < 5) throw new Error('Registre um breve comentário sobre o resultado.');
    const t = ctx.db.tarefas.find(x => x.id === id);
    Object.assign(t, { status: 'concluida', comentario, resumoCliente: resumoCliente || '', dataRealizada: dataRealizada || hoje(), impedimento: null, expurgo: null, fechadoPor: ctx.user?.id || '' });
    ctx.touch('tarefas', t); logar(ctx, 'concluiu', 'tarefas', id, t.titulo); return t;
  },
  'gp.tarefa.naoConcluir': ({ id, origem, justificativa, textoCliente, reprogramar }, ctx) => {
    if (!ORIGENS[origem]) throw new Error('Informe a origem do impedimento.');
    if (!justificativa || justificativa.trim().length < 5) throw new Error('Registre a justificativa.');
    const t = ctx.db.tarefas.find(x => x.id === id);
    t.status = 'nao_concluida'; t.impedimento = { origem, justificativa, textoCliente: textoCliente || '' }; t.fechadoPor = ctx.user?.id || '';
    t.expurgo = ORIGENS[origem].expurgavel ? { status: 'pendente', decididoPor: '', decididoEm: '', auto: false } : null;
    ctx.touch('tarefas', t);
    logar(ctx, 'marcou não concluída', 'tarefas', id, `${t.titulo} — ${ORIGENS[origem].l}`);
    let nova = null;
    if (reprogramar) {
      nova = { ...t, id: uuid(), semana: addDays(t.semana, 7), status: 'planejada', comentario: '', resumoCliente: '', impedimento: null, expurgo: null, dataRealizada: '', fechadoPor: '', reprogramacoes: (t.reprogramacoes || 0) + 1, origemId: t.id };
      ctx.db.tarefas.push(nova); ctx.touch('tarefas', nova);
      logar(ctx, 'reprogramou', 'tarefas', nova.id, `${t.titulo} → semana ${fmtDM(nova.semana)}`);
    }
    return { t, nova };
  },
  'gp.tarefa.reabrir': ({ id }, ctx) => {
    const t = ctx.db.tarefas.find(x => x.id === id);
    Object.assign(t, { status: 'planejada', comentario: '', resumoCliente: '', dataRealizada: '', impedimento: null, expurgo: null, fechadoPor: '' });
    ctx.touch('tarefas', t); logar(ctx, 'reabriu', 'tarefas', id, t.titulo); return t;
  },
  'gp.expurgo.decidir': ({ id, decisao }, ctx) => {
    exigeGestor(ctx);
    const t = ctx.db.tarefas.find(x => x.id === id);
    t.expurgo = { status: decisao, decididoPor: ctx.user.id, decididoEm: hoje(), auto: t.responsavelId === ctx.user.id };
    ctx.touch('tarefas', t);
    logar(ctx, decisao === 'aprovado' ? 'aprovou expurgo' : 'recusou expurgo', 'tarefas', id, t.titulo + (t.expurgo.auto ? ' (autoaprovado)' : '')); return t;
  },
  'gp.marco.concluir': ({ id, data }, ctx) => {
    const m = ctx.db.marcos.find(x => x.id === id); m.status = 'concluido'; m.concluidoEm = data || hoje();
    ctx.touch('marcos', m); logar(ctx, 'concluiu marco', 'marcos', id, m.titulo); return m;
  },
  'gp.marco.reabrir': ({ id }, ctx) => { const m = ctx.db.marcos.find(x => x.id === id); m.status = 'aberto'; m.concluidoEm = ''; ctx.touch('marcos', m); logar(ctx, 'reabriu marco', 'marcos', id, m.titulo); return m; },
  'gp.marco.reprogramar': ({ id, novaData, motivo }, ctx) => {
    if (!novaData || !motivo) throw new Error('Informe a nova data e o motivo.');
    const m = ctx.db.marcos.find(x => x.id === id);
    m.historico = m.historico || []; m.historico.push({ de: m.dataAlvo, para: novaData, motivo, em: hoje() });
    m.dataAlvo = novaData; m.mes = mesKey(novaData); m.reprogramacoes = (m.reprogramacoes || 0) + 1;
    ctx.touch('marcos', m); logar(ctx, 'reprogramou marco', 'marcos', id, `${m.titulo} → ${fmtDMY(novaData)}`); return m;
  },
  'gp.onepage.salvar': (r, ctx) => {
    if (r.aprovar) exigeGestor(ctx);
    let op = ctx.db.onepages.find(x => x.projetoId === r.projetoId && x.semana === r.semana);
    if (!op) { op = { id: `${r.projetoId}_${r.semana}`, projetoId: r.projetoId, semana: r.semana, aprovadoPor: '', aprovadoEm: '', enviadoEm: '' }; ctx.db.onepages.push(op); }
    ['destaque', 'proximosPassos', 'pedidoCliente'].forEach(k => { if (k in r) op[k] = r[k]; });
    if (r.aprovar) { op.aprovadoPor = ctx.user.id; op.aprovadoEm = hoje(); }
    if (r.enviado) op.enviadoEm = hoje();
    ctx.touch('onepages', op);
    logar(ctx, r.aprovar ? 'aprovou one-page' : r.enviado ? 'marcou one-page enviado' : 'salvou one-page', 'onepages', op.id, prjCli(prj(r.projetoId)).sigla + ' ' + fmtDM(r.semana)); return op;
  },
  'gp.config.salvar': (cfg, ctx) => { exigeGestor(ctx); ctx.db.config = { ...ctx.db.config, ...cfg }; ctx.touch('config', { ...ctx.db.config, id: 'geral' }); logar(ctx, 'alterou parâmetros', 'config', 'geral', ''); return ctx.db.config; },
  /* operações de base inteira (gestor) */
  'gp.dados.substituir': ({ db }, ctx) => { if (Persist.modo !== 'local') exigeGestor(ctx); if (!db || !db.projetos) throw new Error('Arquivo inválido.'); DB = normalizar(db); ctx.substituirTudo = true; return DB; },
  'gp.dados.inicializar': ({ email }, ctx) => {
    DB = seedBase(); email = emailKey(email);
    if (email && !DB.consultores.some(c => c.email === email)) DB.consultores.push({ id: uuid(), nome: email.split('@')[0], email, perfil: 'gestor', foto: '', ativo: true });
    ctx.substituirTudo = true; return DB;
  },
  'gp.dados.limparMovimento': (p, ctx) => {
    if (Persist.modo !== 'local') exigeGestor(ctx);
    const novo = { ...seedBase(), consultores: DB.consultores, clientes: DB.clientes, projetos: DB.projetos, tipos: DB.tipos, config: DB.config, demo: false };
    DB = novo; ctx.substituirTudo = true; return DB;
  },
  'gp.dados.demo': (p, ctx) => { if (Persist.modo !== 'local') throw new Error('Demonstração disponível apenas no modo local.'); DB = seedDemo(); ctx.substituirTudo = true; return DB; },
};
function normalizar(db) { const b = seedBase(); COLECOES.concat(['log']).forEach(k => { if (!Array.isArray(db[k])) db[k] = []; }); db.config = { ...b.config, ...(db.config || {}) }; return db; }

/* Única porta de entrada das telas para os dados. */
async function invoke(slug, payload = {}) {
  const h = Handlers[slug];
  if (!h) throw new Error('Ação desconhecida: ' + slug);
  const ctx = {
    db: DB, user: usuarioAtual(), alterados: [], removidos: [], substituirTudo: false,
    touch(c, r) { this.alterados.push([c, r]); }, remove(c, id) { this.removidos.push([c, id]); },
  };
  const r = h(JSON.parse(JSON.stringify(payload)), ctx);
  await Persist.commit(ctx);
  return r;
}
