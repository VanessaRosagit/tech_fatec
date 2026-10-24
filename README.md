# TechFatec (protótipo HTML + CSS + JavaScript, banco em JSON)

## Como abrir
O navegador bloqueia a leitura do `data/db.json` quando a página é aberta direto do arquivo. Use um servidor local:

- Windows: dê dois cliques em `iniciar.bat`
- Linux/Mac: `./iniciar.sh`
- Ou: `python -m http.server 8000` e acesse http://localhost:8000
- VS Code: extensão "Live Server" também serve.

Acesso de demonstração: `gestor@fatec.com` / `Fatec@2026`

## Estrutura
- `index.html` login + recuperação de senha (8 estados do wireframe)
- `dashboard.html`, `indicadores.html`, `participacao.html`, `projetos.html`, `assistente.html`
- `relatorio.html` relatório imprimível (Salvar como PDF)
- `data/db.json` banco: usuários, períodos, disciplinas, professores, grupos, encontros, projetos, participação, metas
- `js/core.js` DOM builder `el()` (sem innerHTML), sessão, acessibilidade, cabeçalho/rodapé
- `js/dados.js` consultas/agregações · `js/charts.js` gráficos SVG/HTML

## Observações
- Os dados são EXEMPLO. Todos os indicadores são calculados a partir do db.json; edite o arquivo para testar.
- JSON é somente leitura no navegador. Alterações (nova senha, conversas e relatórios do assistente) ficam no `localStorage`. Para gravar de verdade no JSON será preciso um back-end (ex.: Node/Express ou json-server).
- A autenticação é só de protótipo (hash SHA-256 no cliente); não oferece segurança real.
