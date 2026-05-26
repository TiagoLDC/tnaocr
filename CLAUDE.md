# TNAOCR — Guia de Desenvolvimento e Deploy

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express + TypeScript (`server.ts`) — serve a SPA e expõe `/api/process-ocr`
- **Auth/DB**: Firebase (Firestore + Auth)
- **IA**: Google Gemini API (`@google/genai`)
- **Dev**: `tsx server.ts` na porta 3006 (configurável via `PORT` env var)

## Rodar localmente

```bash
npm install
npm run dev        # inicia tsx server.ts na porta 3006
```

Acesse: http://localhost:3006

## Variáveis de ambiente

Copiar `.env.example` para `.env` e preencher:

```
GEMINI_API_KEY=sua_chave_aqui
APP_URL=http://localhost:3006
```

---

## Deploy QAS — renomear.tnadigital.com.br

### Infraestrutura

| Item | Valor |
|---|---|
| Servidor | Apache + cPanel |
| Host SSH | renomear.tnadigital.com.br |
| Porta SSH | 22022 |
| Usuário SSH | renomear |
| Projeto no servidor | `/home/renomear/tnaocr/` |
| Porta Docker | 3006 |
| Proxy reverso | `.htaccess` em `public_html/` → `127.0.0.1:3006` |

### Comando: "commit, push, deploy qas"

Quando o usuário pedir **commit + push + deploy qas**, executar na ordem:

#### 1. Commit e push local

```powershell
Set-Location "d:\DEV_WEB\tnaocr"
git add <arquivos alterados>
git commit -m "mensagem descritiva"
git push origin master
```

#### 2. Deploy no servidor via SSH (Python + paramiko)

Usar o script `_ssh_deploy.py` com `$env:PYTHONIOENCODING = "utf-8"`:

```powershell
$env:PYTHONIOENCODING = "utf-8"
python "d:\DEV_WEB\tnaocr\_ssh_deploy.py" "cd /home/renomear/tnaocr && git pull origin master && docker compose up -d --build 2>&1"
```

#### 3. Verificar se subiu

```powershell
$env:PYTHONIOENCODING = "utf-8"
python "d:\DEV_WEB\tnaocr\_ssh_deploy.py" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" "curl -s http://127.0.0.1:3006/api/health"
```

### Script SSH (`_ssh_deploy.py`)

O arquivo `_ssh_deploy.py` na raiz do projeto conecta via SSH com senha usando paramiko.
**Não commitar este arquivo** (já está no `.gitignore`).

Conexão: `renomear@renomear.tnadigital.com.br:22022` senha `@Tmd4738@`

### Adicionar usuário ao grupo Docker (apenas uma vez, requer sudo/root)

```bash
usermod -aG docker renomear
```

### `.htaccess` em `public_html/`

Já configurado. Se precisar recolocar:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ http://127.0.0.1:3006/$1 [P,L]
```

---

## Estrutura de arquivos relevantes

```
tnaocr/
├── src/
│   ├── App.tsx          # SPA principal (React)
│   ├── main.tsx
│   ├── index.css
│   └── lib/firebase.ts  # Firebase config e funções
├── server.ts            # Express: serve SPA + /api/process-ocr
├── Dockerfile           # Multi-stage: Vite build + Express serve
├── docker-compose.yml   # Porta 3006
├── .htaccess            # Proxy reverso cPanel
├── deploy_qas.ps1       # Script de deploy alternativo (PowerShell puro)
├── _ssh_deploy.py       # Helper SSH via paramiko (não commitado)
└── vite.config.ts
```

## Pull Request

Sempre criar branch `feature/...`, abrir PR para `master` e fazer merge antes do deploy:

```powershell
git checkout -b feature/nome-da-feature
# ... alterações ...
git push origin feature/nome-da-feature
gh pr create --title "..." --body "..."
gh pr merge <numero> --merge
git checkout master
git pull origin master
```
