'use strict';
/* ==========================================================================
   TechFatec — núcleo: construtor de DOM, banco JSON, sessão, acessibilidade,
   cabeçalho/rodapé e utilitários. Sem innerHTML: tudo é montado com el().
   ========================================================================== */
const TF = {};
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'title']);

/** el('div', {class:'x', onClick: fn}, filhos...) */
function el(tag, attrs, ...children) {
  const node = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}
const clear = (n) => { n.replaceChildren(); return n; };
const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- ícones ---------- */
const ICONS = {
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  chat: 'M4 5h16v11H9l-5 4z',
  send: 'M5 12h14M13 6l6 6-6 6',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  info: 'M12 8v.01M12 11v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
};
function icon(name, size = 18) {
  return el('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    el('path', { d: ICONS[name] }));
}

/* ---------- armazenamento local (escritas do protótipo) ---------- */
TF.store = {
  get(k, def) { try { const v = localStorage.getItem('tf_' + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem('tf_' + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem('tf_' + k); } catch { /* ignora */ } },
};

/* ---------- formatação ---------- */
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
TF.fmt = {
  num: (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }),
  pct: (n, d = 1) => TF.fmt.num(n, d) + '%',
  data: (iso) => (iso ? iso.split('-').reverse().join('/') : '—'),
  mesCurto: (ym) => MESES_CURTOS[Number(ym.slice(5, 7)) - 1],
  mesNome: (ym) => MESES_NOME[Number(ym.slice(5, 7)) - 1],
  diaMes: (iso) => `${Number(iso.slice(8, 10))} ${MESES_CURTOS[Number(iso.slice(5, 7)) - 1].toLowerCase()}`,
  relativa(iso) {
    const hoje = new Date(); const d = new Date(iso + 'T12:00:00');
    const diff = Math.round((new Date(hoje.toDateString()) - new Date(d.toDateString())) / 864e5);
    if (diff === 0) return 'Hoje'; if (diff === 1) return 'Ontem';
    return TF.fmt.diaMes(iso);
  },
  dias: (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5),
};

/* ---------- toast ---------- */
TF.toast = (msg, tipo = '') => {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = el('div', { class: 'toast ' + tipo, role: 'status' }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 3600);
};

/* ---------- acessibilidade (tamanho da fonte + alto contraste) ---------- */
TF.a11y = {
  estado: () => TF.store.get('a11y', { fs: 0, hc: false }),
  aplicar() {
    const s = TF.a11y.estado(); const h = document.documentElement;
    h.classList.toggle('fs-sm', s.fs < 0); h.classList.toggle('fs-lg', s.fs > 0); h.classList.toggle('hc', !!s.hc);
  },
  barra() {
    const s = TF.a11y.estado();
    const mk = (txt, label, fs) => el('button', { class: 'chip', type: 'button', 'aria-label': label, 'aria-pressed': String(s.fs === fs), dataset: undefined, onClick: () => { TF.store.set('a11y', { ...TF.a11y.estado(), fs }); TF.a11y.aplicar(); sync(); } }, txt);
    const bA = [mk('A−', 'Diminuir fonte', -1), mk('A', 'Fonte padrão', 0), mk('A+', 'Aumentar fonte', 1)];
    const hc = el('button', { class: 'chip hc', type: 'button', 'aria-pressed': String(!!s.hc), onClick: () => { const n = TF.a11y.estado(); TF.store.set('a11y', { ...n, hc: !n.hc }); TF.a11y.aplicar(); sync(); } }, '◐ Alto contraste');
    const bar = el('div', { class: 'a11y no-print', role: 'group', 'aria-label': 'Acessibilidade' }, el('span', { class: 'rot' }, 'Acessibilidade'), ...bA, hc);
    function sync() { const n = TF.a11y.estado(); [-1, 0, 1].forEach((v, i) => bA[i].setAttribute('aria-pressed', String(n.fs === v))); hc.setAttribute('aria-pressed', String(!!n.hc)); }
    return bar;
  },
};

/* ---------- banco de dados JSON ---------- */
TF.loadDB = async () => {
  const r = await fetch('data/db.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  TF.db = await r.json();
  return TF.db;
};
/** Hash SHA-256 (hex) — usado para comparar senhas sem guardá-las em texto puro */
TF.sha256 = async (txt) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
/** Usuário pelo e-mail, já considerando senhas redefinidas no protótipo */
TF.usuario = (email) => {
  const u = TF.db.usuarios.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!u) return null;
  const sobre = TF.store.get('senhas', {});
  return { ...u, senhaHash: sobre[u.email] || u.senhaHash };
};

/* ---------- sessão ---------- */
TF.sessao = () => {
  try {
    const raw = localStorage.getItem('tf_sessao') || sessionStorage.getItem('tf_sessao');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
TF.entrar = (u, manter) => {
  const dado = JSON.stringify({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil });
  try { (manter ? localStorage : sessionStorage).setItem('tf_sessao', dado); } catch { /* ignora */ }
};
TF.sair = () => {
  try { localStorage.removeItem('tf_sessao'); sessionStorage.removeItem('tf_sessao'); } catch { /* ignora */ }
  location.href = 'index.html';
};

/* ---------- cabeçalho / rodapé ---------- */
const NAV = [
  ['dashboard', 'Dashboard', 'dashboard.html'],
  ['indicadores', 'Indicadores', 'indicadores.html'],
  ['participacao', 'Participação', 'participacao.html'],
  ['projetos', 'Projetos e Resultados', 'projetos.html'],
  ['assistente', 'Assistente', 'assistente.html'],
];
const logo = () => el('a', { class: 'logo', href: 'dashboard.html', 'aria-label': 'TechFatec — início' }, 'Tech', el('span', {}, 'Fatec'));

TF.alertas = () => {
  const L = []; const q = TF.q; const sem = q.semestreRef();
  const atr = TF.db.projetos.filter((p) => p.semestre === sem && p.status === 'Atrasado');
  if (atr.length) L.push(`${atr.length} projeto${atr.length > 1 ? 's' : ''} atrasado${atr.length > 1 ? 's' : ''} no ${q.semestre(sem).rotulo}`);
  const mes = TF.db.participacao.reduce((m, r) => (r.mes > m ? r.mes : m), '');
  const baixas = q.participacao({ meses: [mes] }).porDisc.filter((d) => d.freq < 70);
  if (baixas.length) L.push(`${baixas.length} disciplinas com frequência abaixo de 70% em ${TF.fmt.mesNome(mes)}`);
  const novos = q.grupos.novosNoMes(mes);
  if (novos) L.push(`${novos} novos grupos de estudo em ${TF.fmt.mesNome(mes)}`);
  return L.length ? L : ['Nenhum alerta no momento.'];
};

function cabecalho(ativo, user) {
  const pop = el('div', { class: 'popover hidden', id: 'pop-alertas', role: 'region', 'aria-label': 'Alertas' },
    el('h2', {}, 'Alertas'), el('ul', {}, TF.alertas().map((t) => el('li', {}, t))));
  const sino = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Alertas', 'aria-expanded': 'false', 'aria-controls': 'pop-alertas', onClick: () => {
    const abre = pop.classList.toggle('hidden') === false; sino.setAttribute('aria-expanded', String(abre));
  } }, icon('bell', 18));
  document.addEventListener('click', (e) => { if (!pop.contains(e.target) && !sino.contains(e.target)) { pop.classList.add('hidden'); sino.setAttribute('aria-expanded', 'false'); } });
  return el('header', { class: 'top no-print' }, el('div', { class: 'wrap' },
    logo(),
    el('nav', { class: 'nav', 'aria-label': 'Principal' }, NAV.map(([id, rot, href]) => el('a', { href, 'aria-current': id === ativo ? 'page' : null }, rot))),
    el('div', { class: 'user' },
      el('span', { class: 'pill-role' }, (user.perfil || 'gestor')), sino,
      el('span', { class: 'avatar', title: user.nome, 'aria-label': user.nome }, user.nome.charAt(0).toUpperCase()),
      el('button', { class: 'link-btn', type: 'button', onClick: TF.sair }, 'Sair'), pop)));
}

function rodape() {
  const soon = (e) => { e.preventDefault(); TF.toast('Em breve — fora do escopo desta versão do protótipo.'); };
  const li = (txt, href) => el('li', {}, el('a', { href: href || '#', onClick: href ? null : soon }, txt));
  return el('footer', { class: 'foot no-print' }, el('div', { class: 'wrap' },
    el('div', {}, el('div', { class: 'logo' }, 'Tech', el('span', {}, 'Fatec')), el('p', {}, 'Plataforma acadêmica colaborativa para a FATEC.')),
    el('div', {}, el('h2', {}, 'Links'), el('ul', {}, li('Grupos', 'indicadores.html'), li('Agenda'), li('Materiais'), li('Atividades'), li('Projetos', 'projetos.html'))),
    el('div', {}, el('h2', {}, 'Suporte'), el('ul', {}, li('FAQ'), li('Contato'), li('Privacidade')))));
}

TF.erroDB = (root, e) => {
  const arq = location.protocol === 'file:';
  clear(root).append(el('div', { class: 'wrap', style: { padding: '3rem 0' } },
    el('h1', { class: 'title' }, 'Não foi possível ', el('em', {}, 'carregar o banco')),
    el('p', {}, arq
      ? 'A página foi aberta direto do arquivo (file://) e o navegador bloqueia a leitura do data/db.json. Abra a pasta por um servidor local:'
      : 'Erro ao ler data/db.json: ' + (e && e.message)),
    arq ? el('pre', { class: 'card' }, 'cd techfatec\npython -m http.server 8000\n# depois acesse http://localhost:8000') : null));
};

/**
 * Inicializa uma página.
 * opts.publica: não exige login · opts.shell:false: não monta cabeçalho/rodapé
 * fn(box, user) recebe o contêiner de conteúdo.
 */
TF.boot = async (pagina, fn, opts = {}) => {
  TF.a11y.aplicar();
  const root = $('#root');
  try { await TF.loadDB(); } catch (e) { TF.erroDB(root, e); return; }
  let user = TF.sessao();
  if (!opts.publica && !user) { location.replace('index.html'); return; }
  if (opts.shell === false) { await fn(root, user); return; }
  const box = el('div', { class: 'wrap' });
  clear(root).append(
    el('a', { class: 'skip', href: '#conteudo' }, 'Ir para o conteúdo'),
    TF.a11y.barra(), cabecalho(pagina, user),
    el('main', { id: 'conteudo', tabindex: '-1' }, box), rodape(),
    ...(pagina === 'assistente' ? [] : [el('a', { class: 'fab no-print', href: 'assistente.html', 'aria-label': 'Abrir assistente de relatórios', title: 'Assistente de relatórios' }, icon('chat', 20))]));
  await fn(box, user);
};

/* ---------- peças de UI reutilizáveis ---------- */
TF.ui = {
  titulo(trilha, a, b) {
    return [el('p', { class: 'crumb' }, ...trilha.flatMap((t, i) => [i ? ' / ' : '', i === 0 && t.href ? el('a', { href: t.href }, t.txt) : (t.txt || t)])),
      el('h1', { class: 'title' }, a, ' ', el('em', {}, b))];
  },
  kpi(n, t, d, cls = '') { return el('div', { class: 'kpi ' + cls }, el('span', { class: 'n' }, n), el('span', { class: 't' }, t), d ? el('span', { class: 'd' }, d) : null); },
  select(id, rotulo, opcoes, valor) {
    const s = el('select', { class: 'sel', id }, opcoes.map((o) => (o.grupo
      ? el('optgroup', { label: o.grupo }, o.itens.map((i) => el('option', { value: i.v, selected: i.v === valor }, i.t)))
      : el('option', { value: o.v, selected: o.v === valor }, o.t))));
    return { campo: el('div', { class: 'field' }, el('label', { for: id }, rotulo), s), sel: s };
  },
  pill(status) { return el('span', { class: 'pillst st-' + status.split(' ')[0] }, status); },
  progresso(p) { return el('span', { class: 'prog' }, el('span', { class: 'bar' }, el('i', { style: { width: p + '%' } })), p + '%'); },
};

/** Baixa um arquivo de texto gerado no navegador */
TF.baixar = (nome, conteudo, tipo = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob(['﻿', conteudo], { type: tipo }));
  const a = el('a', { href: url, download: nome }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
TF.csv = (linhas) => linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
