'use strict';
/* TechFatec — gráficos leves (HTML/SVG, sem bibliotecas externas) */
const Charts = {
  PALETA: ['#16110f', '#b80f2e', '#9a918a', '#e8b4be', '#d9cfc3'],

  barrasV(itens, { destaque = (i, arr) => i === arr.length - 1, fmt = (v) => v + '%', max } = {}) {
    const m = max || Math.max(...itens.map((i) => i.valor), 1);
    return el('div', { role: 'img', 'aria-label': itens.map((i) => `${i.rotulo}: ${fmt(i.valor)}`).join('; ') },
      el('div', { class: 'bars-v' }, itens.map((it, i, arr) => el('div', { class: 'c' + (destaque(i, arr) ? ' hl' : '') },
        el('b', {}, fmt(it.valor)), el('i', { style: { height: Math.max(2, (it.valor / m) * 80) + '%' } })))),
      el('div', { class: 'bars-l' }, itens.map((it, i, arr) => el('span', { class: destaque(i, arr) ? 'hl' : '' }, it.rotulo))));
  },

  barrasH(itens, { max, fmt = (v) => v, cor = () => null, classe = '' } = {}) {
    const m = max || Math.max(...itens.map((i) => i.valor), 1);
    return el('div', { class: 'bars-h ' + classe }, itens.map((it, i) => el('div', { class: 'r' },
      el('span', { class: 'l', title: it.rotulo }, it.rotulo),
      el('span', { class: 'tr' }, el('i', { style: { width: (it.valor / m) * 100 + '%', background: cor(it, i) || null } })),
      el('span', { class: 'v' }, fmt(it.valor)))));
  },

  legenda(itens, cores) {
    return el('div', { class: 'legend' }, itens.map((it, i) => el('span', {}, el('i', { style: { background: cores[i % cores.length] } }), `${it.rotulo} ${it.valor}`)));
  },

  pizza(itens, { tam = 180, cores = Charts.PALETA } = {}) {
    const total = itens.reduce((s, i) => s + i.valor, 0) || 1; const c = tam / 2; let a0 = -Math.PI / 2;
    const fatias = itens.map((it, i) => {
      const a1 = a0 + (it.valor / total) * Math.PI * 2; const r = c - 2;
      const [x0, y0, x1, y1] = [c + r * Math.cos(a0), c + r * Math.sin(a0), c + r * Math.cos(a1), c + r * Math.sin(a1)];
      const d = it.valor === total ? `M${c},${c - r} A${r},${r} 0 1 1 ${c - .01},${c - r} Z` : `M${c},${c} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
      a0 = a1;
      return el('path', { d, fill: cores[i % cores.length], stroke: 'var(--card)', 'stroke-width': 2 }, el('title', {}, `${it.rotulo}: ${it.valor}`));
    });
    return el('div', {}, el('div', { class: 'chart-c' }, el('svg', { viewBox: `0 0 ${tam} ${tam}`, width: tam, height: tam, role: 'img', 'aria-label': 'Gráfico de pizza: ' + itens.map((i) => `${i.rotulo} ${i.valor}`).join(', ') }, fatias)), Charts.legenda(itens, cores));
  },

  rosca(itens, { tam = 170, cores = Charts.PALETA, centro } = {}) {
    const total = itens.reduce((s, i) => s + i.valor, 0) || 1; let acum = 0;
    const segs = itens.map((it, i) => {
      const p = (it.valor / total) * 100; const s = el('circle', { cx: 21, cy: 21, r: 15.915, fill: 'none', stroke: cores[i % cores.length], 'stroke-width': 6, 'stroke-dasharray': `${p} ${100 - p}`, 'stroke-dashoffset': 25 - acum }, el('title', {}, `${it.rotulo}: ${it.valor}`));
      acum += p; return s;
    });
    return el('div', {}, el('div', { class: 'chart-c' },
      el('svg', { viewBox: '0 0 42 42', width: tam, height: tam, role: 'img', 'aria-label': 'Gráfico de rosca: ' + itens.map((i) => `${i.rotulo} ${i.valor}`).join(', ') }, segs),
      centro ? el('div', { class: 'mid' }, el('b', {}, centro[0]), el('span', {}, centro[1])) : null),
      Charts.legenda(itens, cores));
  },

  linha(pontos, { destaque = () => false, fmt = (v) => v + '%', w = 420, h = 150 } = {}) {
    if (!pontos.length) return el('p', { class: 'muted small' }, 'Sem dados.');
    const vs = pontos.map((p) => p.valor); const min = Math.min(...vs) - 8, max = Math.max(...vs) + 8;
    const px = (i) => 24 + (i * (w - 48)) / Math.max(1, pontos.length - 1); const py = (v) => 14 + (1 - (v - min) / (max - min || 1)) * (h - 44);
    const linhaPts = pontos.map((p, i) => `${px(i)},${py(p.valor)}`).join(' ');
    return el('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', role: 'img', 'aria-label': 'Gráfico de linhas: ' + pontos.map((p) => `${p.rotulo} ${fmt(p.valor)}`).join(', ') },
      el('line', { x1: 8, x2: w - 8, y1: h - 26, y2: h - 26, stroke: 'var(--line)' }),
      el('polyline', { points: linhaPts, fill: 'none', stroke: 'var(--brand)', 'stroke-width': 2 }),
      pontos.map((p, i) => el('g', {},
        el('circle', { cx: px(i), cy: py(p.valor), r: destaque(p, i) ? 5 : 4, fill: destaque(p, i) ? 'var(--brand)' : 'var(--card)', stroke: 'var(--brand)', 'stroke-width': 2 }, el('title', {}, `${p.rotulo}: ${fmt(p.valor)}`)),
        destaque(p, i) ? el('text', { x: px(i), y: py(p.valor) - 10, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'var(--ink)' }, fmt(p.valor)) : null,
        el('text', { x: px(i), y: h - 8, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': destaque(p, i) ? 700 : 400, fill: destaque(p, i) ? 'var(--ink)' : 'var(--muted)' }, p.rotulo))));
  },

  /** Mapa de calor 5×5 (dias da semana × semanas) */
  calor(matriz) {
    const vals = matriz.flat(); const min = Math.min(...vals), max = Math.max(...vals);
    const nivel = (v) => Math.min(3, Math.floor(((v - min) / (max - min || 1)) * 4));
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    return el('div', {},
      el('div', { class: 'heat', role: 'table', 'aria-label': 'Participação por dia da semana e semana do período' },
        el('span', {}), [1, 2, 3, 4, 5].map((s) => el('span', { class: 'h' }, 'S' + s)),
        matriz.flatMap((lin, d) => [el('span', { class: 'rw' }, dias[d]), ...lin.map((v) => el('span', { class: 'cell l' + nivel(v), title: `${dias[d]}, semana: ${Math.round(v)}%` }, Math.round(v) + '%'))])),
      el('div', { class: 'heat-leg' }, 'Menos ', ['l0', 'l1', 'l2', 'l3'].map((c) => el('i', { class: c })), ' Mais'));
  },

  vazio: (txt = 'Nenhum registro para os filtros selecionados.') => el('div', { class: 'vazio', role: 'status' }, txt),
};
