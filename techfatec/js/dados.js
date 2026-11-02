'use strict';
/* ==========================================================================
   TechFatec — consultas ao banco JSON (agregações usadas pelas telas).
   Todos os indicadores são CALCULADOS a partir de data/db.json.
   ========================================================================== */
TF.q = {
  ref: () => TF.db._meta.dataReferencia,
  periodo: (id) => TF.db.periodos.find((p) => p.id === id),
  semestre: (id) => TF.db.semestres.find((s) => s.id === id),
  disciplina: (id) => TF.db.disciplinas.find((d) => d.id === id),
  prof: (id) => TF.db.professores.find((p) => p.id === id),

  semestreRef() {
    const r = TF.q.ref();
    return (TF.db.semestres.find((s) => r >= s.inicio && r <= s.fim) || TF.db.semestres[TF.db.semestres.length - 1]).id;
  },
  /** Lista 'AAAA-MM' entre duas datas ISO */
  meses(inicio, fim) {
    const out = []; let [y, m] = inicio.slice(0, 7).split('-').map(Number); const [y2, m2] = fim.slice(0, 7).split('-').map(Number);
    while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
    return out;
  },
  /** Dias de atraso em relação à data de referência do protótipo */
  atraso: (p) => (p.status === 'Atrasado' ? Math.max(0, TF.fmt.dias(TF.q.ref(), p.prazo)) : 0),

  /** Frequência / atividades / mapa semanal para um conjunto de meses e disciplinas */
  participacao({ meses, disciplinaIds = null }) {
    const regs = TF.db.participacao.filter((r) => meses.includes(r.mes) && (!disciplinaIds || disciplinaIds.includes(r.disciplinaId)));
    const r = { n: regs.length, freq: 0, atvTotal: 0, atvConc: 0, porDisc: [], porMes: [], mapa: null };
    if (!regs.length) return r;
    r.freq = regs.reduce((s, x) => s + x.frequencia, 0) / regs.length;
    r.atvTotal = regs.reduce((s, x) => s + x.atividadesTotal, 0);
    r.atvConc = regs.reduce((s, x) => s + x.atividadesConcluidas, 0);
    const porD = new Map();
    regs.forEach((x) => { const a = porD.get(x.disciplinaId) || []; a.push(x.frequencia); porD.set(x.disciplinaId, a); });
    r.porDisc = [...porD].map(([id, a]) => ({ disc: TF.q.disciplina(id), freq: a.reduce((s, v) => s + v, 0) / a.length })).sort((a, b) => b.freq - a.freq);
    r.mapa = Array.from({ length: 5 }, (_, d) => Array.from({ length: 5 }, (_, w) => regs.reduce((s, x) => s + x.mapa[d][w], 0) / regs.length));
    return r;
  },
  /** Série mensal (frequência + % atividades) de todos os meses com dados */
  serieMensal(disciplinaIds = null) {
    const meses = [...new Set(TF.db.participacao.map((r) => r.mes))].sort();
    return meses.map((mes) => {
      const p = TF.q.participacao({ meses: [mes], disciplinaIds });
      return { mes, freq: p.freq, atv: p.atvTotal ? (p.atvConc / p.atvTotal) * 100 : 0 };
    });
  },

  /** Grupos de estudo */
  grupos: {
    ativosEm(data) { return TF.db.grupos.filter((g) => g.criadoEm <= data && (!g.encerradoEm || g.encerradoEm > data)); },
    fimDoMes(ym) { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); },
    novosNoMes: (ym) => TF.db.grupos.filter((g) => g.criadoEm.startsWith(ym)).length,
    mesAnterior(ym) { let [y, m] = ym.split('-').map(Number); m--; if (m < 1) { m = 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; },
  },
  /** Projetos de um semestre letivo */
  projetosDoSemestre: (sem) => TF.db.projetos.filter((p) => p.semestre === sem),
  contar(lista, chave) { const m = new Map(); lista.forEach((x) => m.set(x[chave], (m.get(x[chave]) || 0) + 1)); return m; },
};

/** Dados de um relatório de participação (usado pelo assistente e pela página imprimível) */
TF.q.relatorio = ({ periodo, grupo }) => {
  const per = TF.db.assistente.periodos.find((p) => p.id === periodo);
  const ids = grupo === 'Todos' ? null : TF.db.disciplinas.filter((d) => d.area === grupo).map((d) => d.id);
  const p = TF.q.participacao({ meses: per.meses, disciplinaIds: ids });
  const ini = per.meses[0] + '-01'; const fim = TF.q.grupos.fimDoMes(per.meses[per.meses.length - 1]);
  const projetos = TF.db.projetos.filter((x) => x.prazo >= ini && x.prazo <= fim && (!ids || ids.includes(x.disciplinaId)));
  const entregues = projetos.filter((x) => x.status === 'Concluído').length;
  const semanas = p.mapa ? [0, 1, 2, 3, 4].map((w) => p.mapa.reduce((s, lin) => s + lin[w], 0) / 5) : [];
  return {
    per, grupo, ids, meses: per.meses, n: p.n, freq: p.freq, atvConc: p.atvConc, atvTotal: p.atvTotal,
    atvPct: p.atvTotal ? (p.atvConc / p.atvTotal) * 100 : 0, porDisc: p.porDisc, mapa: p.mapa, semanas,
    projetos, entregues, projPct: projetos.length ? (entregues / projetos.length) * 100 : 0,
  };
};
