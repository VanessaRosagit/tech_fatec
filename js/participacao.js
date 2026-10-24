'use strict';
/* TechFatec — Indicadores de Participação (wireframe, página 4) */
TF.boot('participacao', (box) => {
  const { db, q, fmt, ui } = { db: TF.db, q: TF.q, fmt: TF.fmt, ui: TF.ui };
  const PADRAO = { grupo: 'todos', periodo: 'ago-set' };
  let aplicado = { ...PADRAO }; const pend = { ...PADRAO };

  const sems = [...new Set(db.disciplinas.map((d) => d.semestreCurso))].sort((a, b) => a - b);
  const selGrupo = ui.select('p-grupo', 'Grupo', [{ v: 'todos', t: 'Todos' }, ...sems.map((s) => ({ grupo: `${s}º semestre`, itens: db.disciplinas.filter((d) => d.semestreCurso === s).map((d) => ({ v: String(d.id), t: d.nome })) }))], PADRAO.grupo);
  const selPer = ui.select('p-periodo', 'Período', db.periodos.map((p) => ({ v: p.id, t: p.rotulo })), PADRAO.periodo);
  const btn = el('button', { class: 'btn', type: 'submit', disabled: true }, 'Aplicar');
  const aviso = el('p', { class: 'resumo-filtro' });
  const saida = el('div');
  [['grupo', selGrupo.sel], ['periodo', selPer.sel]].forEach(([k, s]) => s.addEventListener('change', () => { pend[k] = s.value; btn.disabled = JSON.stringify(pend) === JSON.stringify(aplicado); }));

  const form = el('form', { class: 'filtros', 'aria-label': 'Filtros de participação', onSubmit: (e) => { e.preventDefault(); aplicado = { ...pend }; btn.disabled = true; desenhar(); TF.toast('Filtros aplicados.', 'ok'); } },
    el('p', { class: 'lbl', style: { margin: '0 0 .6rem' } }, 'Filtros'),
    el('div', { class: 'grid' }, selGrupo.campo, selPer.campo, btn));

  function desenhar() {
    const per = q.periodo(aplicado.periodo); const ids = aplicado.grupo === 'todos' ? null : [Number(aplicado.grupo)];
    const meses = q.meses(per.inicio, per.fim);
    const p = q.participacao({ meses, disciplinaIds: ids });
    const nomeGrupo = ids ? q.disciplina(ids[0]).nome : 'Todos os grupos';
    clear(aviso).append(JSON.stringify(aplicado) === JSON.stringify(PADRAO) ? 'Exibindo filtros padrão' : `Exibindo: ${nomeGrupo} · ${per.rotulo}`);
    clear(saida);
    if (!p.n) { saida.append(Charts.vazio(`Sem registros de participação para ${per.rotulo}. Escolha outro período.`)); return; }

    const projs = db.projetos.filter((x) => x.inicio <= per.fim && x.prazo >= per.inicio && (!ids || x.disciplinaId === ids[0]));
    const entregues = projs.filter((x) => x.status === 'Concluído').length;
    const pctAtv = p.atvTotal ? (p.atvConc / p.atvTotal) * 100 : 0;

    /* série de atividades: janela de 6 meses terminando no fim do período */
    const serie = q.serieMensal(ids ? ids : null); const fimYM = per.fim.slice(0, 7);
    let fim = serie.reduce((ix, s, i) => (s.mes <= fimYM ? i : ix), serie.length - 1);
    const janela = serie.slice(Math.max(0, fim - 5), fim + 1);

    saida.append(
      el('div', { class: 'kpis c3' },
        ui.kpi(fmt.pct(p.freq), 'Frequência média', nomeGrupo),
        ui.kpi(fmt.pct(pctAtv, 0), 'Atividades concluídas', `${p.atvConc} / ${p.atvTotal} atividades`),
        ui.kpi(projs.length ? fmt.pct((entregues / projs.length) * 100, 0) : '—', 'Projetos entregues', `${entregues} / ${projs.length} projetos`)),
      el('div', { class: 'grid2' },
        el('section', { class: 'card', 'aria-labelledby': 'h-fg' }, el('h3', { id: 'h-fg' }, 'Frequência por Grupo'), el('div', { class: 'scroll-y', style: { marginTop: '1rem' } },
          Charts.barrasH(p.porDisc.map((d) => ({ rotulo: d.disc.nome, valor: d.freq })), { max: 100, fmt: (v) => fmt.pct(v) }))),
        el('section', { class: 'card', 'aria-labelledby': 'h-ca' }, el('h3', { id: 'h-ca' }, 'Conclusão de Atividades por Mês'), el('div', { style: { marginTop: '1rem' } },
          Charts.linha(janela.map((s) => ({ rotulo: fmt.mesCurto(s.mes), valor: Math.round(s.atv), mes: s.mes })), { destaque: (pt) => pt.mes >= per.inicio.slice(0, 7) && pt.mes <= fimYM, fmt: (v) => v + '%' })))),
      el('p', { class: 'kicker' }, 'Participação por dia da semana'),
      el('section', { class: 'card', 'aria-label': 'Participação por dia da semana' }, Charts.calor(p.mapa)));
  }

  box.append(...ui.titulo([{ txt: 'Dashboard', href: 'dashboard.html' }, 'Indicadores de participação'], 'Indicadores de', 'Participação'), form, aviso, saida);
  desenhar();
});
