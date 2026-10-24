'use strict';
/* TechFatec — login e recuperação de senha (wireframe, página 1) */
TF.boot('login', (root) => {
  if (TF.sessao()) { location.replace('dashboard.html'); return; }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let emailRec = '';
  let timer = null;
  const parar = () => { if (timer) { clearInterval(timer); timer = null; } };
  const ir = (fn, ...a) => {
    parar(); clear(root); fn(...a);
    if (!root.contains(document.activeElement) || document.activeElement === document.body) {
      const h = $('.rec h2, .rec h1', root); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  };

  const erro = (id, txt) => el('p', { class: 'errmsg', id, role: 'alert' }, icon('alert', 14), txt);
  const campoSenha = (id, valor, onInput) => {
    const inp = el('input', { class: 'inp', id, type: 'password', autocomplete: 'off', value: valor || '' });
    const tog = el('button', { class: 'tog', type: 'button', 'aria-controls': id, 'aria-label': 'Mostrar senha', onClick: () => {
      const v = inp.type === 'password'; inp.type = v ? 'text' : 'password';
      tog.textContent = v ? 'Ocultar' : 'Mostrar'; tog.setAttribute('aria-label', v ? 'Ocultar senha' : 'Mostrar senha');
    } }, 'Mostrar');
    if (onInput) inp.addEventListener('input', onInput);
    return { inp, caixa: el('div', { class: 'pw' }, inp, tog) };
  };

  /* ---------- 1.1 Login ---------- */
  function telaLogin(aviso) {
    const ref = TF.q.ref();
    const ativos = TF.q.grupos.ativosEm(ref);
    const part = ativos.reduce((s, g) => s + g.participantes, 0);
    const met = TF.db.metricasSemestre.find((m) => m.semestre === TF.q.semestreRef());
    const email = el('input', { class: 'inp', id: 'email', type: 'email', autocomplete: 'username', placeholder: 'nome@fatec.sp.gov.br', 'aria-describedby': 'e-email' });
    const { inp: senha, caixa } = campoSenha('senha');
    senha.setAttribute('autocomplete', 'current-password');
    const manter = el('input', { type: 'checkbox', id: 'manter', checked: true });
    const msg = el('div', { 'aria-live': 'polite' }, aviso ? el('p', { class: 'errmsg', style: { color: 'var(--green)' } }, aviso) : null);
    const btn = el('button', { class: 'btn block', type: 'submit' }, 'Entrar');

    const form = el('form', { novalidate: true, onSubmit: async (e) => {
      e.preventDefault(); clear(msg);
      email.classList.toggle('err', !email.value.trim()); senha.classList.toggle('err', !senha.value);
      if (!email.value.trim() || !senha.value) { msg.append(erro('e-email', 'Informe e-mail institucional e senha.')); return; }
      btn.disabled = true; btn.textContent = 'Entrando…';
      let ok = null;
      try { const u = TF.usuario(email.value); if (u && u.senhaHash === await TF.sha256(senha.value)) ok = u; }
      catch { msg.append(erro('e-email', 'Este navegador não permite validar a senha fora de localhost/https.')); }
      btn.disabled = false; btn.textContent = 'Entrar';
      if (!ok) { if (!msg.childNodes.length) { msg.append(erro('e-email', 'E-mail ou senha incorretos.')); } email.classList.add('err'); senha.classList.add('err'); senha.focus(); return; }
      TF.entrar(ok, manter.checked); location.href = 'dashboard.html';
    } },
      el('div', { class: 'fld' }, el('label', { class: 'lbl', for: 'email' }, 'E-mail institucional'), email),
      el('div', { class: 'fld' }, el('label', { class: 'lbl', for: 'senha' }, 'Senha'), caixa),
      el('div', { class: 'row-between' }, el('span'), el('button', { class: 'lnk', type: 'button', onClick: () => ir(telaEmail, '') }, 'Esqueci minha senha')),
      el('label', { class: 'chk' }, manter, 'Manter meu acesso neste dispositivo'),
      btn, msg);

    root.append(el('div', { class: 'login' },
      el('section', { class: 'login-art', 'aria-label': 'Apresentação' },
        el('div', { class: 'logo' }, el('span', { class: 'mark' }, 'TF'), el('span', {}, 'Tech', el('span', {}, 'Fatec'))),
        el('div', {}, el('p', { class: 'kick' }, 'Gestão acadêmica integrada'),
          el('h1', {}, 'Dados que fortalecem a comunidade FATEC.'),
          el('p', { class: 'lead' }, 'Acompanhe indicadores, organize grupos e tome decisões com uma visão completa da participação acadêmica.')),
        el('div', { class: 'stats' },
          el('div', {}, el('b', {}, ativos.length), el('span', {}, 'grupos ativos')),
          el('div', {}, el('b', {}, TF.fmt.num(part)), el('span', {}, 'participantes')),
          el('div', {}, el('b', {}, met.resultadosAtingidos + '%'), el('span', {}, 'resultados')))),
      el('section', { class: 'login-form' }, el('div', { class: 'box' },
        el('div', { class: 'lock' }, icon('lock', 18)),
        el('p', { class: 'kicker', style: { margin: 0 } }, 'Área restrita'),
        el('h2', {}, 'Acesse sua conta'),
        el('p', { class: 'help' }, 'Entre com suas credenciais institucionais para continuar.'),
        form,
        el('p', { class: 'demo' }, icon('info', 14), el('span', {}, 'Protótipo — acesso de demonstração: ', el('b', {}, 'gestor@fatec.com'), ' · senha ', el('b', {}, 'Fatec@2026'), '.'))))));
    email.focus();
  }

  /* ---------- casca das telas de recuperação ---------- */
  const casca = (...filhos) => root.append(el('div', { class: 'rec' }, TF.a11y.barra(), el('div', { class: 'rec-body' },
    el('p', { class: 'crumb' }, el('a', { href: 'index.html' }, 'Login'), ' / Recuperar senha'),
    el('h1', {}, 'Esqueceu sua ', el('em', {}, 'senha?')),
    el('p', {}, 'Informe seu e-mail institucional e enviaremos um link para criar uma nova senha.'),
    ...filhos)));
  const voltar = () => el('a', { class: 'lnk back', href: 'index.html', onClick: (e) => { e.preventDefault(); ir(telaLogin); } }, '← Voltar para o login');

  /* ---------- 1.2 e-mail (vazio/erro) ---------- */
  function telaEmail(valor, erroTxt) {
    const inp = el('input', { class: 'inp' + (erroTxt ? ' err' : ''), id: 'rec-email', type: 'email', placeholder: 'nome@fatec.sp.gov.br', value: valor || '', autocomplete: 'username', 'aria-describedby': erroTxt ? 'e-rec' : null, 'aria-invalid': erroTxt ? 'true' : null });
    casca(el('form', { class: 'rec-card', novalidate: true, onSubmit: (e) => {
      e.preventDefault(); const v = inp.value.trim();
      if (!v) return ir(telaEmail, '', 'Informe seu e-mail institucional.');
      if (!EMAIL_RE.test(v)) return ir(telaEmail, v, 'Informe um e-mail válido.');
      emailRec = v; ir(telaEnviado);
    } },
      el('div', { class: 'fld' }, el('label', { class: 'lbl', for: 'rec-email' }, 'E-mail institucional'), inp, erroTxt ? erro('e-rec', erroTxt) : null),
      el('button', { class: 'btn block', type: 'submit' }, 'Enviar link de recuperação'), voltar()));
    inp.focus();
  }

  /* ---------- 1.3 verifique seu e-mail ---------- */
  function telaEnviado() {
    let seg = 30;
    const reenviar = el('button', { class: 'btn ghost block', type: 'button', disabled: true, onClick: () => { TF.toast('Link reenviado (simulação).', 'ok'); ir(telaEnviado); } }, `Reenviar em ${seg} s`);
    casca(el('div', { class: 'rec-card center' },
      el('div', { class: 'mail' }, icon('mail', 20)),
      el('h2', {}, 'Verifique seu e-mail'),
      el('p', { class: 'small muted' }, 'Se o endereço ', el('b', { style: { color: 'var(--ink)' } }, emailRec), ' estiver cadastrado, você receberá um link em alguns minutos. Verifique também a caixa de spam.'),
      el('div', { class: 'stack' }, reenviar,
        el('button', { class: 'btn block', type: 'button', onClick: () => ir(telaNova) }, 'Simular clique no link do e-mail'),
        el('button', { class: 'btn ghost block', type: 'button', onClick: () => ir(telaEmail, emailRec, 'Esse link expirou. Solicite um novo.') }, 'Simular link expirado')),
      voltar()));
    timer = setInterval(() => {
      seg--; if (seg <= 0) { parar(); reenviar.disabled = false; reenviar.textContent = 'Reenviar e-mail'; } else reenviar.textContent = `Reenviar em ${seg} s`;
    }, 1000);
  }

  /* ---------- 1.4 – 1.8 nova senha ---------- */
  function telaNova() {
    const REQS = [['Mínimo de 8 caracteres', (s) => s.length >= 8], ['Uma letra maiúscula', (s) => /[A-Z]/.test(s)], ['Um número', (s) => /\d/.test(s)], ['Um caractere especial', (s) => /[^A-Za-z0-9]/.test(s)]];
    const FORCA = [['Fraca', 12, 'var(--brand)'], ['Fraca', 28, 'var(--brand)'], ['Média', 55, '#d9a441'], ['Média', 75, '#d9a441'], ['Forte', 100, 'var(--green)']];
    const n1 = campoSenha('nova1', '', atualizar); const n2 = campoSenha('nova2', '', atualizar);
    const forcaTxt = el('b', {}, 'Fraca'); const forcaBar = el('i'); const lista = el('ul', { class: 'reqs', 'aria-label': 'Requisitos da senha' });
    const aviso = el('div', { 'aria-live': 'polite' }); const salvar = el('button', { class: 'btn block', type: 'submit', disabled: true }, 'Salvar nova senha');
    function atualizar() {
      const s = n1.inp.value; const ok = REQS.map(([, f]) => f(s)); const n = ok.filter(Boolean).length;
      const [rot, w, cor] = FORCA[n]; forcaTxt.textContent = rot; forcaBar.style.width = w + '%'; forcaBar.style.background = cor;
      clear(lista).append(...REQS.map(([t], i) => el('li', {}, el('span', { class: ok[i] ? 'a' : 'p' }, ok[i] ? 'Atendido' : 'Pendente'), el('span', {}, t))));
      const difere = n2.inp.value.length > 0 && n2.inp.value !== s;
      n2.inp.classList.toggle('err', difere); n2.inp.setAttribute('aria-invalid', String(difere));
      clear(aviso); if (difere) aviso.append(erro('e-conf', 'As senhas não coincidem.'));
      salvar.disabled = !(n === 4 && n2.inp.value === s);
    }
    casca(el('form', { class: 'rec-card', novalidate: true, onSubmit: async (e) => {
      e.preventDefault(); if (salvar.disabled) return;
      try {
        const u = TF.usuario(emailRec);
        if (u) { const s = TF.store.get('senhas', {}); s[u.email] = await TF.sha256(n1.inp.value); TF.store.set('senhas', s); }
      } catch { /* sem crypto.subtle: segue sem gravar */ }
      TF.toast('Senha atualizada. Entre com a nova senha.', 'ok'); ir(telaLogin, 'Senha atualizada com sucesso.');
    } },
      el('h2', {}, 'Crie uma ', el('em', {}, 'nova senha')),
      el('div', { class: 'fld' }, el('label', { class: 'lbl', for: 'nova1' }, 'Nova senha'), n1.caixa,
        el('div', { class: 'forca' }, el('span', {}, 'Força da senha'), forcaTxt), el('div', { class: 'forca-bar' }, forcaBar), lista),
      el('div', { class: 'fld' }, el('label', { class: 'lbl', for: 'nova2' }, 'Confirmar nova senha'), n2.caixa, aviso),
      salvar, voltar()));
    atualizar(); n1.inp.focus();
  }

  telaLogin();
}, { publica: true, shell: false });
