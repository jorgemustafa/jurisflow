## Deploy — Oracle Cloud Always Free (acesso por IP)

Guia para subir o JurisFlow numa VM gratuita da Oracle Cloud, rodando o
`docker compose` 24/7. Como a API mantém o scheduler de sincronização diária
dentro do processo (`ENABLE_SYNC_SCHEDULER`), uma VM que fica sempre ligada é o
ambiente ideal — o agendamento funciona sem alterações no código.

> Cenário deste guia: **1 usuário**, **acesso por IP** (sem domínio/HTTPS
> ainda). Para colocar um domínio + HTTPS depois, basta adicionar um reverse
> proxy (Caddy/nginx) na frente — fica como evolução futura.

### 1. Criar a VM

1. Crie a conta em <https://www.oracle.com/cloud/free/>. Na escolha da região
   (*home region*), selecione **Brazil East (São Paulo)** — `sa-saopaulo-1` —
   para manter os dados de clientes no Brasil (relevante para a LGPD).
2. **Compute → Instances → Create instance**:
   - **Image**: Canonical Ubuntu 22.04.
   - **Shape**: `VM.Standard.A1.Flex` (ARM Ampere — *Always Free*). Configure
     dentro do limite gratuito atual (~2 OCPU / 12 GB no total). Para 1 usuário,
     **1 OCPU / 6 GB** já sobra.
   - **Boot volume**: 50 GB (dentro dos 200 GB gratuitos).
   - **SSH keys**: gere um par localmente e cole a chave pública:
     ```bash
     ssh-keygen -t ed25519 -f ~/.ssh/jurisflow_oracle
     ```
3. Crie a instância e anote o **IP público**. (Opcional: reserve um *Reserved
   public IP* para o IP não mudar.)

> Se aparecer "out of capacity" no shape ARM, tente outro *Availability Domain*
> ou repita mais tarde — é comum no free tier.

### 2. Abrir as portas

São **duas camadas** de firewall. Abra as duas para as portas `3333` (API) e
`5173` (web). Mantenha `22` (SSH) e **não** exponha a `5432` (Postgres).

**a) Firewall da nuvem (VCN):** Networking → Virtual Cloud Network → sua subnet
→ Security List → *Add Ingress Rules*: Source `0.0.0.0/0`, TCP, portas de
destino `3333` e `5173`.

**b) Firewall da VM (Ubuntu da Oracle vem com iptables travado):**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3333 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5173 -j ACCEPT
sudo netfilter-persistent save
```

### 3. Instalar o Docker

```bash
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # ou desconecte e reconecte o SSH
docker compose version
```

### 4. Enviar o código para a VM

```bash
# clonar do GitHub (configure uma deploy key ou use HTTPS)
git clone git@github.com:jorgemustafa/jurisflow.git
cd jurisflow
```

### 5. Configurar produção

Crie o arquivo **`.env`** na raiz (substitua `SEU_IP_PUBLICO` e os tokens):

```dotenv
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/jurisflow?schema=public"
JWT_SECRET="cole-aqui-um-segredo-forte"
DATAJUD_API_KEY="sua-chave-datajud"
```

Gere um `JWT_SECRET` forte:
```bash
openssl rand -hex 32
```

Crie **`compose.override.yml`** (o `docker compose` mescla este arquivo
automaticamente com o `compose.yml`, sem precisar editar o original). Ele aplica
os ajustes de produção: política de reinício, URLs apontando para o IP público,
fuso de São Paulo para o scheduler, migração automática no boot e o Postgres
escutando só em localhost.

```yaml
services:
  api:
    restart: unless-stopped
    command: sh -c "npx prisma migrate deploy && npm run dev:api"
    environment:
      JWT_SECRET: ${JWT_SECRET}
      DATAJUD_API_KEY: ${DATAJUD_API_KEY}
      ESCAVADOR_TOKEN: ${ESCAVADOR_TOKEN}
      WEB_ORIGIN: http://SEU_IP_PUBLICO:5173
      TZ: America/Sao_Paulo
      ENABLE_SYNC_SCHEDULER: "true"
      SYNC_DAILY_TIME: "06:00"
  web:
    restart: unless-stopped
    environment:
      VITE_API_URL: http://SEU_IP_PUBLICO:3333
  postgres:
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
```

### 6. Subir a aplicação

```bash
docker compose up -d --build      # constrói e sobe em background
docker compose logs -f api        # acompanhe a migração e o "scheduled" do sync
```

O `migrate deploy` roda sozinho no start. Para criar o primeiro usuário/dados de
demonstração:

```bash
docker compose exec api npx tsx scripts/seed-demo-data.ts
```

Acesse em **`http://SEU_IP_PUBLICO:5173`**.

### 7. Manutenção do dia a dia

```bash
# logs
docker compose logs -f api
# reiniciar / parar
docker compose restart
docker compose down
# atualizar para uma nova versão do código
git pull && docker compose up -d --build
# backup do banco (rode via cron diário)
docker compose exec -T postgres pg_dump -U postgres jurisflow > backup_$(date +%F).sql
```

Como os serviços usam `restart: unless-stopped`, eles voltam sozinhos após um
reboot da VM. Para um backup automático diário, adicione ao `crontab -e`:

```cron
0 3 * * * cd ~/jurisflow && docker compose exec -T postgres pg_dump -U postgres jurisflow > ~/backups/jurisflow_$(date +\%F).sql
```

### 8. Deploy automático pelo GitHub Actions

O workflow `.github/workflows/ci.yml` executa lint, typecheck, testes, build e
validação Docker em pull requests e pushes para `main` ou `develop`. Somente
um push para `main` atualiza a VM, depois que todos esses checks passam.

Na VM, deixe o clone na branch de deploy e confirme que o acesso ao GitHub
funciona sem interação:

```bash
cd ~/jurisflow
git checkout main
git pull --ff-only origin main
```

Para repositório privado, adicione uma deploy key somente leitura ao repositório
e mantenha a chave privada correspondente em `~/.ssh` na VM. A chave usada pelo
workflow para entrar na VM é outra credencial e deve autorizar acesso ao usuário
de deploy no `~/.ssh/authorized_keys` da VM.

No GitHub, crie o Environment `oracle-vm` e configure:

| Tipo | Nome | Valor |
| --- | --- | --- |
| Secret | `ORACLE_VM_HOST` | IP ou hostname público da VM |
| Secret | `ORACLE_VM_USER` | Usuário SSH, normalmente `ubuntu` |
| Secret | `ORACLE_VM_SSH_KEY` | Chave privada que acessa a VM |
| Secret | `ORACLE_VM_KNOWN_HOSTS` | Linha verificada do host em formato `known_hosts` |
| Variable | `ORACLE_VM_DEPLOY_PATH` | Caminho absoluto do clone, por exemplo `/home/ubuntu/jurisflow` |

Obtenha a linha de `known_hosts` em uma máquina confiável e confira a
fingerprint com a chave SSH da VM antes de salvar o secret:

```bash
ssh-keyscan -H SEU_IP_PUBLICO
```

O `.env` e o `compose.override.yml` da seção 5 permanecem apenas na VM. Em
cada deploy, o workflow avança `main` exatamente até o commit validado pelo
CI, valida a configuração, recria os containers e exige respostas bem-sucedidas
da API e do web. Falha em qualquer etapa marca o deploy como falho. Deploys
concorrentes são serializados e não interrompem uma atualização em andamento.

### Notas

- **Vite host check**: se a página abrir em branco com erro de *blocked host*,
  adicione `allowedHosts: ["SEU_IP_PUBLICO"]` em `server` no
  `apps/web/vite.config.mjs`.
- **Segurança**: por enquanto o tráfego é HTTP (sem criptografia). Antes de
  colocar dados reais de clientes em produção, adicione um domínio + HTTPS
  (Caddy emite certificado Let's Encrypt automático) e troque as senhas padrão
  do Postgres.
- **Sem hibernação**: diferente de PaaS gratuitos (Render etc.), a VM não
  hiberna, então o scheduler de sincronização diária dispara no horário
  configurado.
