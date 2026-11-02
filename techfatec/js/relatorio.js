'use strict';
/* TechFatec — relatório de participação imprimível (use "Salvar como PDF" na impressão) */
TF.boot('relatorio', (root) => {
  const { db, q, fmt } = { db: TF.db, q: TF.q, fmt: TF.fmt };
  const qs = new URLSearchParams(location.search);
  const periodo = qs.get('periodo') || 'set'; const grupo = qs.get('grupo') || 'Todos';
  if (!db.assistente.periodos.some((p) => p.id === periodo)) { clear(root).append(el('div', { class: 'rpt' }, Charts.vazio('Período inválido.'))); return; }
  const rel = q.relatorio({ periodo, grupo });
  const hoje = new Date().toLocaleDateString('pt-BR');

  const tabela = (cab, linhas) => el('div', { class: 'tbl-wrap' }, el('table', { class: 't' },
    el('thead', {}, el('tr', {}, cab.map((h) => el('th', { scope: 'col' }, h)))), el('tbody', {}, linhas.map((l) => el('tr', {}, l.map((c) => el('td', {}, c)))))));

  const corpo = rel.n ? [
    el('div', { class: 'kpis c3' },
      TF.ui.kpi(fmt.pct(rel.freq), 'Frequência média'),
      TF.ui.kpi(fmt.pct(rel.atvPct, 0), 'Atividades concluídas', `${rel.atvConc} / ${rel.atvTotal}`),
      TF.ui.kpi(rel.projetos.length ? fmt.pct(rel.projPct, 0) : '—', 'Projetos entregues', `${rel.entregues} / ${rel.projetos.length}`)),
    el('h2', {}, 'Frequência por semana'), Charts.barrasV(rel.semanas.map((v, i) => ({ rotulo: 'S' + (i + 1), valor: Math.round(v) })), { max: 100 }),
    el('h2', {}, 'Frequência por disciplina'), tabela(['Disciplina', 'Área', 'Frequência média'], rel.porDisc.map((d) => [d.disc.nome, d.disc.area, fmt.pct(d.freq)])),
    el('h2', {}, 'Participação por dia da semana'), Charts.calor(rel.mapa),
    el('h2', {}, 'Projetos com prazo no período'),
    rel.projetos.length ? tabela(['Projeto', 'Status', 'Progresso', 'Prazo'], rel.projetos.sort((a, b) => a.prazo.localeCompare(b.prazo)).map((p) => [p.nome, p.status, p.progresso + '%', fmt.data(p.prazo)])) : Charts.vazio('Nenhum projeto com prazo no período.'),
  ] : [Charts.vazio('Sem dados de participação para este período.')];

  clear(root).append(TF.a11y.barra(), el('div', { class: 'rpt' },
    el('div', { class: 'acoes no-print' },
      el('button', { class: 'btn', type: 'button', onClick: () => window.print() }, 'Imprimir / Salvar como PDF'),
      el('a', { class: 'btn ghost', href: 'assistente.html' }, 'Voltar ao assistente')),
    el('p', { class: 'crumb' }, 'TechFatec · Relatório gerado em ' + hoje),
    el('h1', {}, 'Relatório de ', el('em', { style: { color: 'var(--brand)' } }, 'participação')),
    el('p', { class: 'muted' }, `Período: ${rel.per.rotulo} · Grupo/Curso: ${rel.grupo}`),
    ...corpo,
    el('p', { class: 'small muted', style: { marginTop: '2rem' } }, `Fonte: data/db.json (${db._meta.aviso})`)));
  document.title = `Relatório de participação · ${rel.per.rotulo} · TechFatec`;
  if (qs.get('print') === '1' && rel.n) setTimeout(() => window.print(), 600);
});
