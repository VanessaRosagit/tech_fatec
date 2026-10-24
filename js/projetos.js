'use strict';
/* TechFatec — Projetos e Resultados (wireframe, página 5) */
TF.boot('projetos', (box) => {
  const { db, q, fmt, ui } = { db: TF.db, q: TF.q, fmt: TF.fmt, ui: TF.ui };
  const saida = el('div');
  const sel = ui.select('p-sem', 'Semestre', db.semestres.map((s) => ({ v: s.id, t: s.rotulo })), q.semestreRef());
  sel.campo.style.flex = '0 0 12rem';
  sel.sel.addEventListener('change', () => desenhar(sel.sel.value));

  box.append(el('div', { class: 'proj-head', style: { alignItems: 'flex-end' } },
    el('div', {}, ...ui.titulo([{ txt: 'Dashboard', href: 'dashboard.html' }, 'Projetos e resultados'], 'Projetos e', 'resultados')), sel.campo), saida);

  function desenhar(semId) {
    const sem = q.semestre(semId); const ps = q.projetosDoSemestre(semId); const met = db.metricasSemestre.find((m) => m.semestre === semId);
    clear(saida);
    if (!ps.length) { saida.append(Charts.vazio('Não há projetos registrados neste semestre.')); return; }
    const conc = ps.filter((p) => p.status === 'Concluído').length;
    const atr = ps.filter((p) => p.status === 'Atrasado');
    const and = ps.length - conc - atr.length;
    const areas = [...q.contar(ps, 'area')].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
    const dif = met ? met.resultadosAtingidos - met.meta : 0;
    const tend = met ? (met.entregasNoPrazo.at(-1).pct - met.entregasNoPrazo[0].pct) : 0;

    saida.append(
      el('div', { class: 'kpis c5' },
        ui.kpi(ps.length, 'projetos no semestre', null, 'dark'), ui.kpi(conc, 'concluídos'), ui.kpi(and, 'em andamento'),
        ui.kpi(atr.length, 'atrasados', null, 'red'), ui.kpi(met ? met.resultadosAtingidos + '%' : '—', 'resultados atingidos')),
      el('div', { class: 'grid3' },
        el('section', { class: 'card' }, el('h3', {}, 'Entregas no prazo'), el('p', { class: 'sub' }, 'Percentual de projetos entregues no prazo, por mês'),
          met ? Charts.barrasV(met.entregasNoPrazo.map((e) => ({ rotulo: e.mes, valor: e.pct })), { max: 100 }) : Charts.vazio('Sem série mensal.')),
        el('section', { class: 'card' }, el('h3', {}, 'Status dos projetos'), el('p', { class: 'sub' }, 'Distribuição geral'),
          Charts.rosca([{ rotulo: 'Concluídos', valor: conc }, { rotulo: 'Em andamento', valor: and }, { rotulo: 'Atrasados', valor: atr.length }], { cores: ['#16110f', '#d9cfc3', '#b80f2e'], centro: [ps.length, 'projetos'] })),
        el('section', { class: 'card' }, el('h3', {}, 'Projetos por área'), el('p', { class: 'sub' }, `Total de ${ps.length} projetos`),
          Charts.barrasH(areas, { classe: 'estreito escuro', cor: (_, i) => (i === 0 ? 'var(--brand)' : 'var(--ink)') }))),
      el('div', { class: 'grid2 w' },
        el('section', { class: 'card' }, el('h3', {}, 'Resultados contra a meta'), el('p', { class: 'sub' }, `Meta do semestre: ${met ? met.meta : '—'}%`),
          met ? [el('div', { class: 'meta-bar', role: 'img', 'aria-label': `Resultado ${met.resultadosAtingidos}% para meta de ${met.meta}%` },
            el('i', { style: { width: met.resultadosAtingidos + '%' } }), el('u', { style: { left: met.meta + '%' } }), el('s', { style: { left: met.meta + '%' } }, `META ${met.meta}%`)),
            el('div', { class: 'meta-ends' }, el('span', {}, '0%'), el('span', {}, '100%')),
            el('p', { class: 'small', style: { margin: '1rem 0 0' } }, 'Resultados ', el('b', {}, dif === 0 ? 'na meta' : `${Math.abs(dif)} ponto${Math.abs(dif) > 1 ? 's' : ''} ${dif > 0 ? 'acima da' : 'abaixo da'} meta`), ' do semestre. ',
              `Tendência de ${tend > 0 ? 'alta' : tend < 0 ? 'queda' : 'estabilidade'} nos últimos ${met.entregasNoPrazo.length} meses.`)] : Charts.vazio('Sem meta cadastrada.')),
        el('section', { class: 'card leitura' }, el('h3', {}, 'Leitura rápida'), el('p', { class: 'sub' }, 'Resumo para decisão'),
          el('p', {}, el('b', {}, `${conc} de ${ps.length}`), ` projetos já foram concluídos. `,
            atr.length ? `${atr.length} ${atr.length > 1 ? 'exigem' : 'exige'} atenção por atraso. ` : 'Nenhum projeto está em atraso. ',
            'A área de ', el('b', {}, areas[0].rotulo), ` concentra o maior volume, com ${areas[0].valor} projetos. Use o `, el('a', { href: 'assistente.html', style: { color: 'var(--brand)' } }, 'assistente'), ' para gerar o relatório completo.'))),
      el('div', { class: 'proj-head', style: { marginTop: '2rem' } }, el('h2', { class: 'sec' }, 'Projetos em atenção'), el('span', { class: 'lbl' }, 'Somente consulta')),
      atr.length
        ? el('div', { class: 'tbl-wrap table-scroll' }, el('table', { class: 't' },
          el('thead', {}, el('tr', {}, ['Projeto', 'Área', 'Modalidade', 'Atraso', 'Status'].map((h) => el('th', { scope: 'col' }, h)))),
          el('tbody', {}, atr.sort((a, b) => q.atraso(b) - q.atraso(a)).map((p) => el('tr', {}, el('td', {}, p.nome), el('td', {}, p.area), el('td', {}, p.modalidade), el('td', {}, `${q.atraso(p)} dias`), el('td', {}, ui.pill('Atrasado')))))))
        : Charts.vazio(`Nenhum projeto em atraso no ${sem.rotulo}.`));
  }
  desenhar(sel.sel.value);
});
