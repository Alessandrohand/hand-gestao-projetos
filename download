/* ============================================================
   Indicadores — regras de cálculo
   ============================================================ */
const horasPorte = p => (DB.config.porte || {})[p] || 0;
const con = id => DB.consultores.find(c => c.id === id);
const cli = id => DB.clientes.find(c => c.id === id);
const prj = id => DB.projetos.find(p => p.id === id);
const prjCli = p => cli(p.clienteId) || {};
const ini = id => DB.iniciativas.find(i => i.id === id);
const mar = id => DB.marcos.find(m => m.id === id);
const tipo = id => DB.tipos.find(t => t.id === id);
const gestorId = () => DB.config.gestorId;
const projetosAtivos = () => DB.projetos.filter(p => p.status === 'ativo');
const img = v => !v ? '' : v.startsWith('asset:') ? (ASSETS.logos[v.slice(6)] || ASSETS.fotos[v.slice(6)] || '') : v;
const dataTarefa = t => t.dataRealizada || addDays(t.semana, 2);
const ehInteracao = t => MODALIDADES[t.modalidade]?.cliente;
const ehPresenca = t => t.status === 'concluida' && MODALIDADES[t.modalidade]?.presenca;
const comGestor = t => t.responsavelId === gestorId() || (t.participantes || []).includes(gestorId());
const expurgada = t => t.expurgo?.status === 'aprovado';

/* semanas fechadas = anteriores à semana corrente */
function semanasAte(fim, n) { return Array.from({ length: n }, (_, i) => addDays(fim, -7 * (n - 1 - i))); }

/* Confiabilidade do compromisso: horas-porte concluídas / horas-porte planejadas.
   Fora do cálculo: tarefas não planejadas e expurgos aprovados. */
function confiab(tarefas) {
  let plan = 0, feito = 0, exp = 0, pend = 0;
  tarefas.forEach(t => {
    if (t.naoPlanejada) return;
    const h = horasPorte(t.porte);
    if (expurgada(t)) { exp += h; return; }
    if (t.status === 'planejada') pend += h;
    plan += h; if (t.status === 'concluida') feito += h;
  });
  return { plan, feito, exp, pend, pct: plan ? feito / plan : null };
}

/* Avanço: marcos com data-alvo original dentro do período e já vencidos — concluídos no prazo / total */
function avanco(marcos, ini_, fim_) {
  const lim = hoje() < fim_ ? hoje() : fim_;
  const alvo = marcos.filter(m => { const d = m.dataAlvoOriginal || m.dataAlvo; return d >= ini_ && d <= lim; });
  const noPrazo = alvo.filter(m => m.status === 'concluido' && m.concluidoEm <= (m.dataAlvoOriginal || m.dataAlvo)).length;
  const concl = alvo.filter(m => m.status === 'concluido').length;
  return { total: alvo.length, noPrazo, concl, pct: alvo.length ? noPrazo / alvo.length : null };
}

function presencasMes(projetoId, mes) {
  return DB.tarefas.filter(t => t.projetoId === projetoId && ehPresenca(t) && mesKey(dataTarefa(t)) === mes);
}
function farolPresenca(qtd, mes) {
  const meta = DB.config.metaPresencaMes || 3;
  if (qtd >= meta) return 'g';
  const atual = mesKey(hoje());
  if (mes < atual) return qtd >= meta - 1 ? 'y' : 'r';
  const [y, m] = mes.split('-').map(Number); const dias = new Date(y, m, 0).getDate();
  const esperado = Math.floor(meta * new Date().getDate() / dias);
  return qtd >= esperado ? 'y' : 'r';
}
const marcosDoProjeto = pid => DB.marcos.filter(m => ini(m.iniciativaId)?.projetoId === pid);
const marcoEmRisco = m => m.status !== 'concluido' && (m.dataAlvo < hoje() || (m.reprogramacoes || 0) >= 2);

function ultimaParticipacaoGestor(pid) {
  const ts = DB.tarefas.filter(t => t.projetoId === pid && t.status === 'concluida' && comGestor(t) && ehInteracao(t)).map(dataTarefa).sort();
  return ts.length ? ts[ts.length - 1] : null;
}
function pct(v, d = 0) { return v == null ? '—' : (v * 100).toFixed(d) + '%'; }
function farolPct(v) { return v == null ? 'n' : v >= .85 ? 'g' : v >= .7 ? 'y' : 'r'; }
