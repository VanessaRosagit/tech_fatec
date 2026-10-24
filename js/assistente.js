'use strict';
/* TechFatec — Assistente de relatórios (wireframe, página 6)
   O assistente é baseado em regras: reconhece a intenção da pergunta e responde
   com números CALCULADOS do db.json (nenhum valor é escrito à mão). */
TF.boot('assistente', (box) => {
  const { db, q, fmt, ui } = { db: TF.db, q: TF.q, fmt: TF.fmt, ui: TF.ui };
  const A = db.assistente;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ANO = q.ref().slice(0, 4);
  const MES_IDX = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mesMencionado = (t) => { const i = MES_IDX.findIndex((m) => norm(t).includes(m)); return i < 0 ? null : `${ANO}-${String(i + 1).padStart(2, '0')}`; };
  const pontos = (n) => `${fmt.num(Math.abs(n), 1)} ponto${Math.abs(n) >= 1.05 || Math.abs(n) < 0.95 ? 's' : ''}`;
  const idsGrupo = (g) => (g === 'Todos' ? null : db.disciplinas.filter((d) => d.area === g).map((d) => d.id));
  const rotMes = (ym) => `${fmt.mesCurto(ym)}${ym.slice(0, 4) === ANO ? '' : ' ' + ym.slice(0, 4)}`;
  const nomeArquivo = (rel) => `Participação_${rel.per.id === 'semestre' ? 'Sem' : fmt.mesCurto(rel.meses[0])}${ANO}.pdf`;

  /* ---------- motor de respostas (blocos de dados puros, gravados no localStorage) ---------- */
  function responder(texto, filtros, ctx) {
    const t = norm(texto); const novoCtx = { ...ctx };
    const mm = mesMencionado(texto);
    const periodoDoMes = (ym) => A.periodos.find((p) => p.meses.length === 1 && p.meses[0] === ym);

    if (/compar\w*.*(turma|programa)/.test(t)) {
      const rel = q.relatorio({ periodo: filtros.periodo, grupo: 'Todos' });
      const prog = rel.porDisc.filter((d) => d.disc.area === 'Programação');
      if (!prog.length) return { blocos: [{ tipo: 'texto', t: 'Não há dados de turmas de Programação neste período.' }], ctx: novoCtx };
      const media = prog.reduce((s, d) => s + d.freq, 0) / prog.length;
      return { ctx: novoCtx, blocos: [
        { tipo: 'texto', t: `Em ${rel.per.rotulo}, as turmas de Programação tiveram frequência média de **${fmt.pct(media)}**. A maior foi **${prog[0].disc.nome}** (${fmt.pct(prog[0].freq)}) e a menor **${prog.at(-1).disc.nome}** (${fmt.pct(prog.at(-1).freq)}).` },
        { tipo: 'grafico', orient: 'h', titulo: 'Frequência por turma (%)', itens: prog.map((d) => ({ rotulo: d.disc.nome, valor: Math.round(d.freq * 10) / 10 })) }] };
    }
    if (/atras/.test(t)) {
      const sem = q.semestreRef(); const at = q.projetosDoSemestre(sem).filter((p) => p.status === 'Atrasado').sort((a, b) => q.atraso(b) - q.atraso(a));
      return { ctx: novoCtx, blocos: at.length
        ? [{ tipo: 'texto', t: `Há **${at.length} projeto${at.length > 1 ? 's' : ''} atrasado${at.length > 1 ? 's' : ''}** no ${q.semestre(sem).rotulo}:` }, { tipo: 'lista', itens: at.map((p) => `${p.nome} — ${q.atraso(p)} dias de atraso (${p.area}, ${p.modalidade})`) }]
        : [{ tipo: 'texto', t: `Nenhum projeto está atrasado no ${q.semestre(sem).rotulo}.` }] };
    }
    if (/engaj|caiu|queda|diminu|piorou/.test(t)) {
      const s = q.serieMensal(idsGrupo(filtros.grupo)); if (s.length < 2) return { blocos: [{ tipo: 'texto', t: 'Não há meses suficientes para comparar.' }], ctx: novoCtx };
      let pior = { d: 0 }; for (let i = 1; i < s.length; i++) { const d = s[i].freq - s[i - 1].freq; if (d < pior.d) pior = { d, de: s[i - 1].mes, para: s[i].mes }; }
      const ult = s.at(-1), pen = s.at(-2); const dUlt = ult.freq - pen.freq;
      const baixas = q.participacao({ meses: [ult.mes], disciplinaIds: idsGrupo(filtros.grupo) }).porDisc.slice(-3).reverse();
      return { ctx: novoCtx, blocos: [
        { tipo: 'texto', t: `Em ${fmt.mesNome(ult.mes)} a frequência média ${dUlt >= 0 ? 'subiu' : 'caiu'} **${pontos(dUlt)}** em relação a ${fmt.mesNome(pen.mes)} (${fmt.pct(pen.freq)} → ${fmt.pct(ult.freq)}). ${pior.de ? `A maior queda mensal do ano foi de ${fmt.mesNome(pior.de)} para ${fmt.mesNome(pior.para)} (−${pontos(pior.d).replace(' pontos', ' p.p.').replace(' ponto', ' p.p.')}).` : 'Não houve queda mensal no período.'}` },
        { tipo: 'grafico', orient: 'v', titulo: 'Frequência média por mês (%)', itens: s.map((x) => ({ rotulo: fmt.mesCurto(x.mes), valor: Math.round(x.freq) })) },
        { tipo: 'texto', t: `Menores frequências em ${fmt.mesNome(ult.mes)}:` }, { tipo: 'lista', itens: baixas.map((d) => `${d.disc.nome} — ${fmt.pct(d.freq)}`) },
        { tipo: 'texto', t: 'Os dados mostram onde e quando a frequência variou, mas não as causas — isso exige conversar com professores e turmas.' }] };
    }
    if (/compar\w*|versus|\bvs\b/.test(t) && (mm || /anterior/.test(t))) {
      const base = (ctx.meses && ctx.meses.length === 1 ? ctx.meses[0] : null) || (periodoDoMes(`${ANO}-09`) ? `${ANO}-09` : null);
      const outro = mm || q.grupos.mesAnterior(base);
      const a = q.participacao({ meses: [base], disciplinaIds: idsGrupo(filtros.grupo) }); const b = q.participacao({ meses: [outro], disciplinaIds: idsGrupo(filtros.grupo) });
      if (!a.n || !b.n) return { blocos: [{ tipo: 'texto', t: `Não há dados de frequência para comparar ${fmt.mesNome(base)} com ${fmt.mesNome(outro)}.` }], ctx: novoCtx };
      const d = a.freq - b.freq;
      return { ctx: novoCtx, blocos: [
        { tipo: 'texto', t: `A frequência ${d >= 0 ? 'subiu' : 'caiu'} **${pontos(d)}** em relação a ${fmt.mesNome(outro)} (${fmt.pct(b.freq)} → ${fmt.pct(a.freq)}).` },
        { tipo: 'grafico', orient: 'v', titulo: 'Comparativo mensal', itens: [{ rotulo: rotMes(outro), valor: Math.round(b.freq * 10) / 10 }, { rotulo: rotMes(base), valor: Math.round(a.freq * 10) / 10 }], dec: true }] };
    }
    if (/resumo|semestre/.test(t)) {
      const sem = q.semestreRef(); const ps = q.projetosDoSemestre(sem); const met = db.metricasSemestre.find((m) => m.semestre === sem);
      const rel = q.relatorio({ periodo: 'semestre', grupo: filtros.grupo }); const conc = ps.filter((p) => p.status === 'Concluído').length;
      return { ctx: novoCtx, blocos: [{ tipo: 'texto', t: `Resumo do ${q.semestre(sem).rotulo}:` }, { tipo: 'lista', itens: [
        `${ps.length} projetos: ${conc} concluídos, ${ps.length - conc - ps.filter((p) => p.status === 'Atrasado').length} em andamento e ${ps.filter((p) => p.status === 'Atrasado').length} atrasados`,
        `Frequência média: ${fmt.pct(rel.freq)} · atividades concluídas: ${fmt.pct(rel.atvPct, 0)}`,
        met ? `Resultados atingidos: ${met.resultadosAtingidos}% (meta ${met.meta}%)` : 'Sem meta cadastrada'] }] };
    }
    if (/relat|particip|frequ|gere|gerar/.test(t)) {
      const periodo = mm && periodoDoMes(mm) ? periodoDoMes(mm).id : filtros.periodo;
      const rel = q.relatorio({ periodo, grupo: filtros.grupo });
      if (!rel.n) return { blocos: [{ tipo: 'texto', t: `Não há dados de participação para ${rel.per.rotulo}.` }], ctx: novoCtx };
      novoCtx.meses = rel.meses;
      const mesTxt = rel.meses.length === 1 ? `Em ${fmt.mesNome(rel.meses[0])}` : `No período (${rel.per.rotulo})`;
      return { ctx: novoCtx, blocos: [
        { tipo: 'texto', t: `${mesTxt} a frequência média foi de **${fmt.pct(rel.freq)}**, com **${fmt.pct(rel.atvPct, 0)}** das atividades concluídas e **${fmt.pct(rel.projPct, 0)}** dos projetos entregues.` },
        { tipo: 'grafico', orient: 'v', titulo: 'Frequência por semana (%)', itens: rel.semanas.map((v, i) => ({ rotulo: 'S' + (i + 1), valor: Math.round(v) })) },
        { tipo: 'arquivo', nome: nomeArquivo(rel), detalhe: '3 páginas · 4 gráficos', periodo, grupo: filtros.grupo }] };
    }
    return { ctx: novoCtx, blocos: [{ tipo: 'texto', t: 'Posso gerar relatórios de participação, comparar meses ou turmas, listar projetos atrasados, analisar variações de frequência e resumir o semestre. Tente uma das sugestões abaixo.' }] };
  }

  /* ---------- estado persistido ---------- */
  const filtros = { periodo: 'set', grupo: 'Todos' };
  let conversas = TF.store.get('conversas', null); let relatorios = TF.store.get('relatorios', null);
  if (!conversas) {
    conversas = A.conversas.map((c) => { let ctx = {}; const mensagens = [];
      c.perguntas.forEach((p) => { mensagens.push({ r: 'u', t: p }); const out = responder(p, filtros, ctx); ctx = out.ctx; mensagens.push({ r: 'b', blocos: out.blocos }); });
      return { id: c.id, titulo: c.titulo, data: c.data, mensagens, ctx }; });
    TF.store.set('conversas', conversas);
  }
  if (!relatorios) { relatorios = A.relatorios.slice(); TF.store.set('relatorios', relatorios); }
  let atual = conversas[0].id;
  const salvar = () => { TF.store.set('conversas', conversas); TF.store.set('relatorios', relatorios); };
  const conv = () => conversas.find((c) => c.id === atual);

  /* ---------- exportações ---------- */
  const abrirRelatorio = (periodo, grupo, imprimir) => window.open(`relatorio.html?periodo=${encodeURIComponent(periodo)}&grupo=${encodeURIComponent(grupo)}${imprimir ? '&print=1' : ''}`, '_blank', 'noopener');
  function registrar(rel) {
    const nome = nomeArquivo(rel);
    if (!relatorios.some((r) => r.nome === nome)) { relatorios.unshift({ id: 'r' + Date.now(), nome, data: new Date().toISOString().slice(0, 10), periodo: rel.per.id, grupo: rel.grupo }); salvar(); desenharLateral(); }
  }
  function exportarPDF() { const rel = q.relatorio(filtros); if (!rel.n) return TF.toast('Sem dados para este período.', 'err'); registrar(rel); abrirRelatorio(filtros.periodo, filtros.grupo, true); }
  function exportarExcel() {
    const rel = q.relatorio(filtros); if (!rel.n) return TF.toast('Sem dados para este período.', 'err');
    TF.baixar(`Participacao_${rel.per.id}.csv`, TF.csv([['Período', rel.per.rotulo], ['Grupo/Curso', rel.grupo], [], ['Disciplina', 'Área', 'Frequência média (%)'],
      ...rel.porDisc.map((d) => [d.disc.nome, d.disc.area, fmt.num(d.freq, 1)]), [], ['Frequência média (%)', fmt.num(rel.freq, 1)], ['Atividades concluídas', `${rel.atvConc}/${rel.atvTotal}`], ['Projetos entregues', `${rel.entregues}/${rel.projetos.length}`]]));
    TF.toast('Arquivo .csv gerado — abre direto no Excel.', 'ok');
  }
  function exportarImagem() {
    const rel = q.relatorio(filtros); if (!rel.n) return TF.toast('Sem dados para este período.', 'err');
    const cv = el('canvas', { width: 720, height: 360 }); const g = cv.getContext('2d');
    g.fillStyle = '#fffdf9'; g.fillRect(0, 0, 720, 360); g.fillStyle = '#16110f'; g.font = '500 30px Georgia, serif'; g.fillText(`Participação · ${rel.per.rotulo}`, 40, 70);
    g.font = '13px sans-serif'; g.fillStyle = '#7a716b'; g.fillText(`Grupo/Curso: ${rel.grupo}`, 40, 98);
    g.fillStyle = '#b80f2e'; g.font = '500 64px Georgia, serif'; g.fillText(fmt.pct(rel.freq), 40, 190); g.fillText(fmt.pct(rel.atvPct, 0), 380, 190);
    g.fillStyle = '#7a716b'; g.font = '14px sans-serif'; g.fillText('frequência média', 40, 216); g.fillText('atividades concluídas', 380, 216);
    g.fillStyle = '#efe8de'; g.fillRect(40, 250, 640, 14); g.fillStyle = '#b80f2e'; g.fillRect(40, 250, 640 * Math.min(1, rel.freq / 100), 14);
    g.fillStyle = '#16110f'; g.font = '700 16px Georgia, serif'; g.fillText('TechFatec', 40, 322);
    cv.toBlob((b) => { const url = URL.createObjectURL(b); const a = el('a', { href: url, download: `Participacao_${rel.per.id}.png` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); TF.toast('Imagem gerada.', 'ok'); });
  }

  /* ---------- renderização ---------- */
  const rich = (s) => s.split('**').map((p, i) => (i % 2 ? el('b', {}, p) : p));
  const bloco = (b) => {
    if (b.tipo === 'texto') return el('p', { style: { margin: 0 } }, rich(b.t));
    if (b.tipo === 'lista') return el('ul', {}, b.itens.map((i) => el('li', {}, i)));
    if (b.tipo === 'grafico') return el('div', { class: 'gr' }, el('div', { class: 'gt' }, b.titulo),
      b.orient === 'h' ? Charts.barrasH(b.itens, { max: 100, fmt: (v) => fmt.num(v, 1) + '%' }) : Charts.barrasV(b.itens, { fmt: (v) => (b.dec ? fmt.num(v, 1) : v) + '%', destaque: (i, a) => i === a.length - 1, max: 100 }));
    if (b.tipo === 'arquivo') return el('div', { class: 'arq' }, el('span', { class: 'pdf' }, 'PDF'), el('div', {}, el('b', {}, b.nome), el('small', {}, b.detalhe)),
      el('button', { class: 'btn', type: 'button', onClick: () => abrirRelatorio(b.periodo, b.grupo, true) }, 'Baixar'));
    return null;
  };
  const msgs = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversa' });
  function desenharChat() {
    clear(msgs);
    conv().mensagens.forEach((m) => msgs.append(m.r === 'u' ? el('div', { class: 'm-user' }, m.t) : el('div', { class: 'm-bot' }, el('span', { class: 'av', 'aria-hidden': 'true' }, 'TF'), el('div', { class: 'bub' }, m.blocos.map(bloco)))));
    if (!conv().mensagens.length) msgs.append(el('div', { class: 'm-bot' }, el('span', { class: 'av', 'aria-hidden': 'true' }, 'TF'), el('div', { class: 'bub' }, 'Olá! Peça um relatório ou escolha uma sugestão abaixo.')));
    msgs.scrollTop = msgs.scrollHeight;
  }
  const lista = el('div'); const listaRel = el('div');
  function desenharLateral() {
    clear(lista).append(...conversas.map((c) => el('button', { class: 'conv', type: 'button', 'aria-current': String(c.id === atual), onClick: () => { atual = c.id; desenharLateral(); desenharChat(); fechar(); } }, c.titulo, el('small', {}, fmt.relativa(c.data)))));
    clear(listaRel).append(...relatorios.map((r) => el('button', { class: 'rel', type: 'button', title: 'Abrir relatório', onClick: () => abrirRelatorio(r.periodo, r.grupo, false) }, el('span', { class: 'pdf' }, 'PDF'), el('span', {}, r.nome, el('small', {}, fmt.relativa(r.data))))));
  }
  function enviar(texto) {
    const t = texto.trim(); if (!t) return; const c = conv();
    if (!c.mensagens.length) { c.titulo = t.length > 38 ? t.slice(0, 36) + '…' : t; c.data = new Date().toISOString().slice(0, 10); }
    c.mensagens.push({ r: 'u', t }); desenharLateral(); desenharChat();
    const esp = el('div', { class: 'm-bot' }, el('span', { class: 'av' }, 'TF'), el('div', { class: 'bub typing' }, 'Analisando os dados…')); msgs.append(esp); msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { const out = responder(t, filtros, c.ctx || {}); c.ctx = out.ctx; c.mensagens.push({ r: 'b', blocos: out.blocos }); salvar(); desenharChat(); }, 450);
  }
  const campo = el('input', { class: 'inp', type: 'text', placeholder: 'Pergunte algo ou peça um relatório…', 'aria-label': 'Mensagem para o assistente', autocomplete: 'off' });
  const form = el('form', { class: 'composer', onSubmit: (e) => { e.preventDefault(); const v = campo.value; campo.value = ''; enviar(v); } }, campo,
    el('button', { class: 'send', type: 'submit', 'aria-label': 'Enviar' }, icon('send', 18)));
  const sug = el('div', { class: 'sug' }, A.sugestoes.map((s) => el('button', { type: 'button', onClick: () => enviar(s) }, s)));

  /* filtros + prévia */
  const selPer = ui.select('a-per', 'Período', A.periodos.map((p) => ({ v: p.id, t: p.rotulo })), filtros.periodo);
  const selGr = ui.select('a-gr', 'Grupo / Curso', A.grupos.map((g) => ({ v: g, t: g })), filtros.grupo);
  const previa = el('div', { class: 'prev' });
  function desenharPrevia() {
    const rel = q.relatorio(filtros); clear(previa);
    previa.append(el('h4', {}, `Participação · ${rel.per.rotulo}`), ...(rel.n
      ? [el('div', { class: 'nums' }, el('div', {}, el('b', {}, fmt.pct(rel.freq)), el('span', {}, 'frequência')), el('div', {}, el('b', {}, fmt.pct(rel.atvPct, 0)), el('span', {}, 'atividades'))), el('div', { class: 'mini' }, el('i', { style: { width: rel.freq + '%' } }))]
      : [el('p', { class: 'small muted' }, 'Sem dados para este período.')]));
  }
  [['periodo', selPer.sel], ['grupo', selGr.sel]].forEach(([k, s]) => s.addEventListener('change', () => { filtros[k] = s.value; desenharPrevia(); }));
  selPer.campo.className = ''; selGr.campo.className = '';
  selPer.campo.querySelector('label').className = 'lbl'; selGr.campo.querySelector('label').className = 'lbl';
  selPer.campo.style.margin = '0 0 .9rem'; selGr.campo.style.margin = '0 0 .9rem';
  [selPer.campo, selGr.campo].forEach((c) => { c.style.display = 'grid'; c.style.gap = '.3rem'; });

  /* painéis móveis */
  const colConv = el('aside', { class: 'ass-col ass-side conv-col', 'aria-label': 'Conversas' });
  const colFilt = el('aside', { class: 'ass-col filt', 'aria-label': 'Filtros do relatório' });
  const fechar = () => { colConv.classList.remove('open'); colFilt.classList.remove('open'); };
  const x = () => el('button', { class: 'drawer-x', type: 'button', 'aria-label': 'Fechar painel', onClick: fechar }, icon('x', 16));
  function nova() {
    const novaC = { id: 'c' + Date.now(), titulo: 'Nova conversa', data: new Date().toISOString().slice(0, 10), mensagens: [], ctx: {} };
    conversas.unshift(novaC); atual = novaC.id; salvar(); desenharLateral(); desenharChat(); fechar(); campo.focus();
  }
  colConv.append(x(), el('button', { class: 'btn block', type: 'button', onClick: nova }, '+ Nova conversa'), el('div', { class: 'lbl' }, 'Conversas'), lista, el('div', { class: 'lbl' }, 'Relatórios gerados'), listaRel);
  colFilt.append(x(), el('div', { class: 'lbl', style: { marginBottom: '.8rem' } }, 'Filtros do relatório'), selPer.campo, selGr.campo, el('div', { class: 'lbl' }, 'Prévia'), previa,
    el('div', { class: 'stack' }, el('button', { class: 'btn block', type: 'button', onClick: exportarPDF }, 'Exportar PDF'), el('button', { class: 'btn ghost block', type: 'button', onClick: exportarExcel }, 'Exportar Excel'), el('button', { class: 'btn ghost block', type: 'button', onClick: exportarImagem }, 'Exportar imagem')));

  box.append(...ui.titulo([{ txt: 'Dashboard', href: 'dashboard.html' }, 'Assistente'], 'Assistente', 'de relatórios'),
    el('div', { class: 'mob-btns' }, el('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Abrir conversas', onClick: () => colConv.classList.add('open') }, icon('menu', 16)), el('button', { class: 'btn ghost', type: 'button', onClick: () => colFilt.classList.add('open') }, 'Filtros')),
    el('div', { class: 'ass' }, colConv, el('section', { class: 'ass-col chat', 'aria-label': 'Chat' }, msgs, sug, form), colFilt));
  desenharLateral(); desenharChat(); desenharPrevia();
});
