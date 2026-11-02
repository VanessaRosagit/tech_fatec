'use strict';
/* TechFatec — Dashboard Gestor (wireframe, página 2) */
TF.boot('dashboard', (box) => {
  const { db, q, fmt, ui } = { db: TF.db, q: TF.q, fmt: TF.fmt, ui: TF.ui };
  const PADRAO = { periodo: 'ago-set', semestre: 'todos', prof: 'todos', grupo: 'todos', status: 'todos' };
  let aplicado = { ...PADRAO }; let pend = { ...PADRAO };
  let modo = 'agrupado'; let busca = '';

  /* ---------- opções dos filtros (vindas do banco) ---------- */
  const semCurso = [...new Set(db.disciplinas.map((d) => d.semestreCurso))].sort((a, b) => a - b);
  const selPeriodo = ui.select('f-periodo', 'Período', db.periodos.map((p) => ({ v: p.id, t: p.rotulo })), pend.periodo);
  const selSem = ui.select('f-sem', 'Semestre', [{ v: 'todos', t: 'Todos os semestres' }, ...semCurso.map((s) => ({ v: String(s), t: `${s}º Semestre` }))], pend.semestre);
  const selProf = ui.select('f-prof', 'Professor', [{ v: 'todos', t: 'Todos os professores' }, ...db.professores.map((p) => ({ v: String(p.id), t: p.nome }))], pend.prof);
  const selGrupo = ui.select('f-grupo', 'Grupo (matéria)', [{ v: 'todos', t: 'Todos os grupos' }, ...semCurso.map((s) => ({ grupo: `${s}º semestre`, itens: db.disciplinas.filter((d) => d.semestreCurso === s).map((d) => ({ v: String(d.id), t: d.nome })) }))], pend.grupo);
  const selStatus = ui.select('f-status', 'Status', [{ v: 'todos', t: 'Todos' }, ...['Concluído', 'Avançado', 'Em andamento', 'Atrasado'].map((s) => ({ v: s, t: s }))], pend.status);
  const mapa = { periodo: selPeriodo.sel, semestre: selSem.sel, prof: selProf.sel, grupo: selGrupo.sel, status: selStatus.sel };
  const btnAplicar = el('button', { class: 'btn', type: 'submit', disabled: true }, 'Aplicar');
  const resumo1 = el('p', { class: 'resumo-filtro' }); const resumo2 = el('p', { class: 'resumo-filtro' });
  const kpisBox = el('div', { class: 'kpis', 'aria-live': 'polite' });
  const listaBox = el('div');

  Object.entries(mapa).forEach(([k, s]) => s.addEventListener('change', () => {
    pend[k] = s.value; btnAplicar.disabled = JSON.stringify(pend) === JSON.stringify(aplicado);
  }));
  const form = el('form', { class: 'filtros', 'aria-label': 'Filtros do dashboard', onSubmit: (e) => {
    e.preventDefault(); aplicado = { ...pend }; btnAplicar.disabled = true; desenhar(); TF.toast('Filtros aplicados.', 'ok');
  } }, el('div', { class: 'grid' }, selPeriodo.campo, selSem.campo, selProf.campo, selGrupo.campo, selStatus.campo, btnAplicar));

  /* ---------- dados filtrados ---------- */
  function filtrar(f) {
    const per = q.periodo(f.periodo);
    return db.projetos.filter((p) => {
      const d = q.disciplina(p.disciplinaId);
      return p.inicio <= per.fim && p.prazo >= per.inicio
        && (f.semestre === 'todos' || d.semestreCurso === Number(f.semestre))
        && (f.prof === 'todos' || d.professorId === Number(f.prof))
        && (f.grupo === 'todos' || d.id === Number(f.grupo))
        && (f.status === 'todos' || p.status === f.status);
    });
  }

  function desenhar() {
    const f = aplicado; const per = q.periodo(f.periodo); const proj = filtrar(f);
    const nomeSel = (s) => s.options[s.selectedIndex].text;
    const padrao = JSON.stringify(f) === JSON.stringify(PADRAO);
    clear(resumo1).append([per.rotulo, ...['semestre', 'prof', 'grupo'].map((k) => { const o = mapa[k]; return [...o.options].find((x) => x.value === f[k]).text; })].join(' · ') + (f.status !== 'todos' ? ' · ' + f.status : ''));
    clear(resumo2).append(padrao ? 'Exibindo filtros padrão' : 'Exibindo filtros personalizados');

    /* KPIs */
    const discIds = [...new Set(proj.map((p) => p.disciplinaId))];
    const part = q.participacao({ meses: q.meses(per.inicio, per.fim), disciplinaIds: discIds });
    const atr = proj.filter((p) => p.status === 'Atrasado').length;
    clear(kpisBox).append(
      ui.kpi(discIds.length, 'Grupos ativos'),
      ui.kpi(fmt.num(proj.reduce((s, p) => s + p.integrantes, 0)), 'Participantes', 'integrantes nos projetos'),
      ui.kpi(part.n ? fmt.pct(part.freq) : '—', 'Frequência média'),
      ui.kpi(proj.length, 'Projetos'),
      ui.kpi(atr, 'Atrasados'));

    desenharLista(proj);
  }

  /* ---------- lista de projetos ---------- */
  const discNome = (p) => q.disciplina(p.disciplinaId).nome;
  const visiveis = (proj) => {
    const t = busca.trim().toLowerCase();
    return t ? proj.filter((p) => (p.nome + ' ' + discNome(p)).toLowerCase().includes(t)) : proj;
  };
  const linhas = (lista, comDisc) => lista.map((p) => el('tr', {},
    el('td', {}, p.nome), comDisc ? el('td', {}, discNome(p)) : null,
    el('td', {}, `${p.integrantes} alunos`), el('td', {}, ui.pill(p.status)), el('td', {}, ui.progresso(p.progresso)), el('td', {}, fmt.data(p.prazo))));
  const cabecalho = (comDisc) => el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Projeto'), comDisc ? el('th', { scope: 'col' }, 'Disciplina') : null,
    el('th', { scope: 'col' }, 'Integrantes'), el('th', { scope: 'col' }, 'Status'), el('th', { scope: 'col' }, 'Progresso'), el('th', { scope: 'col' }, 'Prazo')));

  let ultimos = [];
  function desenharLista(proj) {
    ultimos = proj; const lista = visiveis(proj); clear(listaBox);
    if (!lista.length) { listaBox.append(Charts.vazio(proj.length ? 'Nenhum projeto corresponde à busca.' : 'Nenhum projeto encontrado para os filtros selecionados.')); return; }
    if (modo === 'plano') {
      listaBox.append(el('div', { class: 'tbl-wrap table-scroll' }, el('table', { class: 't' }, cabecalho(true), el('tbody', {}, linhas(lista, true)))));
      return;
    }
    const grupos = new Map();
    lista.forEach((p) => { const a = grupos.get(p.disciplinaId) || []; a.push(p); grupos.set(p.disciplinaId, a); });
    [...grupos].sort((a, b) => q.disciplina(a[0]).semestreCurso - q.disciplina(b[0]).semestreCurso || q.disciplina(a[0]).nome.localeCompare(q.disciplina(b[0]).nome)).forEach(([id, ps]) => {
      const d = q.disciplina(id); const prog = ps.reduce((s, p) => s + p.progresso, 0) / ps.length;
      listaBox.append(el('section', { class: 'grp' },
        el('div', { class: 'grp-h' },
          el('div', {}, el('h3', {}, d.nome), el('div', { class: 'meta' }, `${q.prof(d.professorId).nome} · ${d.semestreCurso}º Semestre`)),
          el('div', { class: 'tot' }, el('span', {}, `${ps.length} projeto${ps.length > 1 ? 's' : ''}`), el('span', {}, `${Math.round(prog)}% progresso`), el('span', {}, `${ps.reduce((s, p) => s + p.integrantes, 0)} alunos`))),
        el('div', { class: 'tbl-wrap table-scroll' }, el('table', { class: 't' }, cabecalho(false), el('tbody', {}, linhas(ps, false))))));
    });
  }

  const inpBusca = el('input', { class: 'search', type: 'search', placeholder: 'Buscar projeto…', 'aria-label': 'Buscar projeto', onInput: (e) => { busca = e.target.value; desenharLista(ultimos); } });
  const segA = el('button', { type: 'button', 'aria-pressed': 'true', onClick: () => trocar('agrupado') }, 'Agrupado');
  const segP = el('button', { type: 'button', 'aria-pressed': 'false', onClick: () => trocar('plano') }, 'Lista plana');
  function trocar(m) { modo = m; segA.setAttribute('aria-pressed', String(m === 'agrupado')); segP.setAttribute('aria-pressed', String(m === 'plano')); desenharLista(ultimos); }
  const exportar = () => {
    const lista = visiveis(ultimos);
    if (!lista.length) return TF.toast('Não há projetos para exportar.', 'err');
    const cab = ['Projeto', 'Disciplina', 'Professor', 'Semestre do curso', 'Integrantes', 'Status', 'Progresso (%)', 'Prazo'];
    TF.baixar('projetos_techfatec.csv', TF.csv([cab, ...lista.map((p) => { const d = q.disciplina(p.disciplinaId); return [p.nome, d.nome, q.prof(d.professorId).nome, d.semestreCurso, p.integrantes, p.status, p.progresso, fmt.data(p.prazo)]; })]));
    TF.toast(`${lista.length} projetos exportados.`, 'ok');
  };

  box.append(...ui.titulo([{ txt: 'Dashboard', href: 'dashboard.html' }, 'Gestor'], 'Dashboard', 'Gestor'),
    form, resumo1, resumo2, kpisBox,
    el('p', { class: 'kicker' }, 'Projetos'),
    el('div', { class: 'proj-head' }, el('h2', { class: 'sec' }, 'Projetos e entregas'),
      el('div', { class: 'proj-tools' }, inpBusca, el('div', { class: 'seg', role: 'group', 'aria-label': 'Modo de exibição' }, segA, segP),
        el('button', { class: 'btn ghost', type: 'button', onClick: exportar }, 'Exportar CSV'))),
    listaBox);
  desenhar();
});
