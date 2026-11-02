'use strict';
/* TechFatec — Indicadores de Grupos (wireframe, página 3) */
TF.boot('indicadores', (box) => {
  const { db, q, fmt, ui } = { db: TF.db, q: TF.q, fmt: TF.fmt, ui: TF.ui };
  const ym = q.ref().slice(0, 7); const ant = q.grupos.mesAnterior(ym); const ano = ym.slice(0, 4);
  const sinal = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

  const ativos = q.grupos.ativosEm(q.ref());
  const ativosAnt = q.grupos.ativosEm(q.grupos.fimDoMes(ant));
  const novos = q.grupos.novosNoMes(ym); const novosAnt = q.grupos.novosNoMes(ant);
  const media = ativos.reduce((s, g) => s + g.participantes, 0) / (ativos.length || 1);
  const encontros = db.encontros.filter((e) => e.realizado && e.data.slice(0, 7) >= ant && e.data.slice(0, 7) <= ym).length;

  const porArea = [...q.contar(ativos, 'area')].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
  const ORDEM_MOD = ['Online', 'Presencial', 'Híbrido'];
  const porMod = ORDEM_MOD.map((rotulo) => ({ rotulo, valor: ativos.filter((g) => g.modalidade === rotulo).length }));
  const top = [...ativos].sort((a, b) => b.participantes - a.participantes || a.nome.localeCompare(b.nome)).slice(0, 4);

  box.append(...ui.titulo([{ txt: 'Dashboard', href: 'dashboard.html' }, 'Indicadores de grupos'], 'Indicadores de', 'Grupos'),
    el('div', { class: 'kpis' },
      ui.kpi(ativos.length, 'Grupos ativos', `${sinal(ativos.length - ativosAnt.length)} este mês`),
      ui.kpi(novos, 'Novos grupos', `${sinal(novos - novosAnt)} vs. mês anterior`),
      ui.kpi(fmt.num(media, 1), 'Média participantes/grupo'),
      ui.kpi(encontros, 'Encontros realizados', `${fmt.mesCurto(ant)}/${fmt.mesCurto(ym)} ${ano}`)),
    el('div', { class: 'grid2' },
      el('section', { class: 'card', 'aria-labelledby': 'h-area' }, el('h3', { id: 'h-area' }, 'Grupos por Área'), el('div', { style: { marginTop: '1rem' } }, Charts.pizza(porArea, { tam: 170 }))),
      el('section', { class: 'card', 'aria-labelledby': 'h-mod' }, el('h3', { id: 'h-mod' }, 'Grupos por Modalidade'), el('div', { style: { marginTop: '1rem' } },
        Charts.barrasV(porMod.map((m) => ({ rotulo: m.rotulo, valor: m.valor })), { fmt: (v) => String(v), destaque: () => true, max: Math.max(...porMod.map((m) => m.valor)) * 1.1 })))),
    el('p', { class: 'kicker' }, 'Top grupos por participantes'),
    el('div', { class: 'tbl-wrap table-scroll' }, el('table', { class: 't' },
      el('thead', {}, el('tr', {}, ['Grupo', 'Área', 'Modalidade', 'Participantes'].map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, top.map((g) => el('tr', {}, el('td', {}, g.nome), el('td', {}, g.area), el('td', {}, g.modalidade), el('td', {}, g.participantes)))))));
});
