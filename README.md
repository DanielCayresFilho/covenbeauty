# 🌙 Coven Beauty — Backend

Backend do salão de beleza e estética místico **Coven Beauty**, em NestJS.

## Stack

- **NestJS 11** (TypeScript)
- **PostgreSQL** + **Prisma** (ORM)
- **Redis** + **BullMQ** (filas para produção)
- **Argon2id** (hash de senha)
- **JWT** (access + refresh token com rotação e revogação)
- **Swagger** (documentação da API)
- **Helmet** + **Throttler** (segurança / rate limit)

## Pré-requisitos

- Node 24+, pnpm 11+
- PostgreSQL e Redis (via `docker compose up -d` ou instâncias próprias)

## Setup

```bash
# 1. Dependências
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env   # ajuste os segredos JWT e credenciais

# 3. Subir Postgres + Redis (opcional, se não tiver locais)
docker compose up -d

# 4. Gerar o cliente Prisma
pnpm prisma:generate

# 5. Criar as tabelas (primeira migration)
pnpm prisma migrate dev --name init

# 6. Criar o usuário administrador
pnpm db:seed

# 7. Rodar em desenvolvimento
pnpm start:dev
```

API em `http://localhost:3000/api` · Swagger em `http://localhost:3000/api/docs`.

## Modelo de acesso

- **`User`** = quem opera o sistema (admin). Faz login com senha. Criado via seed.
- **`Client`** = cliente do salão. **Não faz login, não tem senha.** É cadastrado pelo admin.

## Endpoints

| Método | Rota                | Acesso  | Descrição                                  |
| ------ | ------------------- | ------- | ------------------------------------------ |
| POST   | `/api/auth/login`   | Público | Autentica o admin (access + refresh token) |
| POST   | `/api/auth/refresh` | Público | Rotaciona os tokens via refresh token      |
| POST   | `/api/auth/forgot-password` | Público | Envia código de 6 dígitos por e-mail (Brevo) |
| POST   | `/api/auth/reset-password`  | Público | Redefine a senha com o código          |
| POST   | `/api/auth/logout`  | JWT     | Revoga todas as sessões do usuário         |
| GET    | `/api/users/me`     | JWT     | Perfil do usuário autenticado              |
| GET    | `/api/users`        | ADMIN   | Lista usuários do sistema                  |
| POST   | `/api/clients`      | ADMIN   | Cadastra um cliente                        |
| GET    | `/api/clients`      | ADMIN   | Lista clientes (busca + paginação)         |
| GET    | `/api/clients/:id`  | ADMIN   | Detalha um cliente                         |
| PATCH  | `/api/clients/:id`  | ADMIN   | Atualiza um cliente                        |
| DELETE | `/api/clients/:id`  | ADMIN   | Remove um cliente                          |
| POST   | `/api/categories`   | ADMIN   | Cria categoria de produtos                 |
| GET    | `/api/categories`   | ADMIN   | Lista categorias (com contagem de produtos)|
| GET    | `/api/categories/:id` | ADMIN | Detalha categoria                          |
| PATCH  | `/api/categories/:id` | ADMIN | Atualiza categoria                         |
| DELETE | `/api/categories/:id` | ADMIN | Remove categoria (se não tiver produtos)   |
| POST   | `/api/products`     | ADMIN   | Cadastra produto                           |
| GET    | `/api/products`     | ADMIN   | Lista produtos (busca, filtros, paginação) |
| GET    | `/api/products/:id` | ADMIN   | Detalha produto                            |
| PATCH  | `/api/products/:id` | ADMIN   | Atualiza produto (não altera estoque)      |
| POST   | `/api/products/:id/restock` | ADMIN | Repõe estoque (entram N embalagens)    |
| DELETE | `/api/products/:id` | ADMIN   | Remove produto                             |
| POST   | `/api/procedure-categories`     | ADMIN | Cria categoria de procedimento     |
| GET    | `/api/procedure-categories`     | ADMIN | Lista categorias de procedimento   |
| GET    | `/api/procedure-categories/:id` | ADMIN | Detalha categoria                  |
| PATCH  | `/api/procedure-categories/:id` | ADMIN | Atualiza categoria                 |
| DELETE | `/api/procedure-categories/:id` | ADMIN | Remove categoria (se sem procedim.)|
| POST   | `/api/procedures`   | ADMIN   | Cadastra procedimento                      |
| GET    | `/api/procedures`   | ADMIN   | Lista procedimentos (busca, filtro, pág.)  |
| GET    | `/api/procedures/:id` | ADMIN | Detalha procedimento                       |
| PATCH  | `/api/procedures/:id` | ADMIN | Atualiza procedimento                      |
| DELETE | `/api/procedures/:id` | ADMIN | Remove procedimento                        |
| GET    | `/api/users/professionals` | ADMIN | Lista profissionais ativos (agenda)   |
| POST   | `/api/appointments` | ADMIN   | Cria atendimento (fim = soma das durações) |
| POST   | `/api/appointments/block` | ADMIN | Cria bloqueio de agenda                 |
| POST   | `/api/appointments/:id/return` | ADMIN | Gera retorno (reagenda procedimentos)|
| GET    | `/api/appointments` | ADMIN   | Lista agenda (filtros + intervalo + pág.)  |
| GET    | `/api/appointments/:id` | ADMIN | Detalha agendamento                      |
| PATCH  | `/api/appointments/:id` | ADMIN | Atualiza (status, pagamento, sinal...)    |
| DELETE | `/api/appointments/:id` | ADMIN | Remove agendamento                       |
| POST   | `/api/comandas`     | ADMIN   | Abre a comanda de um agendamento           |
| GET    | `/api/comandas`     | ADMIN   | Lista comandas (filtros + paginação)       |
| GET    | `/api/comandas/:id` | ADMIN   | Detalha comanda (com prévia de valores)    |
| POST   | `/api/comandas/:id/procedures` | ADMIN | Adiciona procedimento             |
| DELETE | `/api/comandas/:id/procedures/:itemId` | ADMIN | Remove procedimento       |
| POST   | `/api/comandas/:id/products` | ADMIN | Registra produto consumido (baixa estoque)|
| DELETE | `/api/comandas/:id/products/:itemId` | ADMIN | Remove consumo (estorna estoque)  |
| POST   | `/api/comandas/:id/close` | ADMIN | Fecha a comanda (pagamento, abate sinal)  |
| DELETE | `/api/comandas/:id` | ADMIN   | Exclui comanda aberta (estorna estoque)    |
| POST   | `/api/financial/accounts` | ADMIN | Cria conta no plano de contas             |
| POST   | `/api/financial/accounts/sync-procedures` | ADMIN | Traz procedimentos como contas de entrada |
| GET/PATCH/DELETE | `/api/financial/accounts[/:id]` | ADMIN | CRUD do plano de contas         |
| POST   | `/api/financial/entries` | ADMIN | Cria lançamento (entrada/saída/movimentação)|
| GET/PATCH/DELETE | `/api/financial/entries[/:id]` | ADMIN | CRUD de lançamentos             |
| POST/GET/PATCH/DELETE | `/api/financial/goals[/:id]` | ADMIN | Metas por período (com progresso) |
| GET    | `/api/financial/reports/income` | ADMIN | Entradas por dia/semana/mês           |
| GET    | `/api/financial/reports/summary` | ADMIN | Resumo do período (entradas/saídas/lucro)|
| GET    | `/api/financial/reports/cash-flow` | ADMIN | Fluxo de caixa mensal do ano        |
| POST   | `/api/evaluations`  | ADMIN   | Cria ficha de avaliação de um cliente      |
| GET    | `/api/evaluations?clientId=` | ADMIN | Lista fichas (histórico do cliente)   |
| GET    | `/api/evaluations/:id` | ADMIN | Detalha uma ficha                         |
| PATCH  | `/api/evaluations/:id` | ADMIN | Atualiza uma ficha                        |
| DELETE | `/api/evaluations/:id` | ADMIN | Remove uma ficha                          |
| POST   | `/api/reminders`    | ADMIN   | Cria um lembrete                           |
| POST   | `/api/reminders/generate-birthdays` | ADMIN | Gera lembretes de aniversário do mês |
| GET    | `/api/reminders?status=overdue` | ADMIN | Lista lembretes (pending/completed/overdue)|
| GET    | `/api/reminders/:id` | ADMIN  | Detalha um lembrete                        |
| PATCH  | `/api/reminders/:id` | ADMIN  | Atualiza um lembrete                       |
| POST   | `/api/reminders/:id/complete` | ADMIN | Marca como concluído                  |
| POST   | `/api/reminders/:id/reopen` | ADMIN | Reabre um lembrete concluído            |
| DELETE | `/api/reminders/:id` | ADMIN  | Remove um lembrete                         |
| GET    | `/api/health`       | Público | Healthcheck                                |

### Lembretes

Tarefas do salão (ex.: "Arrumar cafeteira") com `dueDate` e prioridade (`LOW`/`MEDIUM`/`HIGH`).
Cada lembrete retorna campos calculados: `status` (`pending`/`completed`/`overdue`),
`isOverdue`, `isCompleted` e `daysOverdue`. **Atraso** = vencido e não concluído.
Concluir/reabrir via `/complete` e `/reopen`. Filtro `?status=overdue` mostra os atrasados.

**Aniversários automáticos**: `POST /reminders/generate-birthdays?month=&year=` (padrão: mês/ano
atual) cria um lembrete `CLIENT_BIRTHDAY` por cliente que faz aniversário no mês, para lembrar
de mandar mensagem. **Idempotente** (não duplica — índice único por cliente/tipo/data). Ideal
disparar por um cron mensal ou ao abrir o dashboard.

### Analytics

`GET /analytics/summary?from=&to=` (padrão: **mês atual**) → clientes novos, atendimentos,
atendimentos concluídos, **retornos**, bloqueios, comandas fechadas, **faturamento** e ticket médio.

`GET /analytics/top-clients?from=&to=&limit=` (padrão: **ano atual**) → **clientes que mais
gastaram**, por soma das comandas fechadas (com nº de visitas).

### Ficha de avaliação (anamnese)

Prontuário **histórico** por cliente (`ClientEvaluation`) — um cliente tem várias fichas ao
longo do tempo, para acompanhar a evolução. Campos estruturados (não JSON), em 5 seções:

- **Saúde geral**: alergias, doenças crônicas, alterações hormonais, medicamentos, marca-passo/
  implantes metálicos/dentário (contraindicam correntes elétricas), gestação/lactação, cirurgia recente.
- **Hábitos de vida**: sono, água, intestino, fumo/álcool, estresse (1–10).
- **Facial**: fototipo (Fitzpatrick I–VI), tipo de pele, skincare, protetor solar/FPS, histórico
  estético, sensibilidade/rosácea, exposição solar.
- **Capilar (tricologia)**: frequência de lavagem, queixas no couro cabeludo, queda/histórico
  familiar, químicas + data do último procedimento, fontes de calor/protetor térmico, rotina.
- **Consentimento**: declaração de veracidade, autorização de imagem (prontuário e/ou redes
  sociais) e assinatura (nome, data, imagem base64/URL).

`focus` = `FACIAL` / `CAPILLARY` / `BOTH`. Os campos estruturados permitem cruzar
contraindicações no futuro (ex.: marca-passo → bloquear equipamentos de corrente elétrica).

### Financeiro

Réplica digital da planilha de fluxo de caixa (lançamentos **manuais**, valores **brutos**).

- **Plano de contas** (`FinancialAccount`): contas por tipo — `INCOME`, `VARIABLE_COST`,
  `FIXED_EXPENSE`, `PRO_LABORE`, `INVESTMENT`. As de entrada vêm dos procedimentos
  (`/accounts/sync-procedures` cria uma conta `INCOME` por procedimento).
- **Lançamentos** (`FinancialEntry`): livro-caixa. Com `accountId` → a categoria vem da conta;
  sem conta → só movimentações abaixo da linha (`PROFIT_DISTRIBUTION`, `APPLICATION`, `REDEMPTION`).
- **Parte 1 — básico**: `/reports/income` (entradas por dia/semana/mês) + **metas** (`/goals`,
  valor-alvo por período com % de progresso).
- **Parte 2 — fluxo de caixa** (`/reports/cash-flow?year=2026`): consolidação mensal com
  `Saldo Inicial · Entradas · Saídas · Custos Variáveis · Despesas Fixas · Pró-labore ·
  Investimentos · Lucro Líquido · Margem % · Distribuição · Aplicação · Resgate · Saldo Final`
  + coluna de Total. Fórmulas:
  - `Saídas = Custos Var. + Despesas Fixas + Pró-labore + Investimentos`
  - `Lucro Líquido = Entradas − Saídas` · `Margem = Lucro ÷ Entradas`
  - `Saldo Final = Saldo Inicial + Lucro − Distribuição − Aplicação + Resgate`
  - `Saldo Inicial (mês) = Saldo Final (mês anterior)` (janeiro = `openingBalance`)

### Comanda (o "realizado" — fonte do financeiro)

Fluxo: cliente chega → **abre a comanda** (copia os procedimentos do agendamento) →
profissional **adiciona/remove procedimentos** e **registra produtos consumidos**
(ex.: shampoo 150ml, que **dá baixa na `usableQuantity`** do produto) → **fecha** informando
a forma de pagamento.

- No fechamento: `total = subtotal − desconto`; **abate o sinal** já pago no agendamento →
  `amountDue = total − sinal`. A taxa incide sobre o `amountDue`.
- Enquanto aberta, o `GET /:id` traz um `summary` com subtotal, sinal e o valor a pagar.
- Fechar a comanda marca o agendamento como `COMPLETED`.
- **Retorno no fechamento**: o `close` aceita `willReturn`, `returnProcedureIds` (subconjunto
  da comanda) e `returnDate`. Se marcado, cria **automaticamente** o agendamento de retorno
  (ligado à origem por `parentId`), tudo na **mesma transação** — valida conflito de horário
  antes de fechar; se falhar, nada é fechado. O retorno criado volta em `returnAppointment`.
- **⚠️ Financeiro consome a COMANDA fechada, não o agendamento** — o cliente pode fazer
  procedimentos a mais e pagar a diferença aqui.

### Taxas (atualizado)

| Forma | Taxa | Quem recebe |
| ----- | ---- | ----------- |
| Débito | 2,79% | salão absorve |
| Crédito 1x / 2x / 3x | 5,99% / 11,39% / 12,49% | salão absorve |
| Crédito >3x | 0% | **salão recebe cheio** (igual PIX) |
| PIX / Dinheiro | 0% | salão recebe cheio |

### Agendamentos

- **Profissional = `User`** com `isProfessional=true` (o admin já nasce profissional).
- Um agendamento tem **N procedimentos**; o **fim é calculado** por `início + soma das durações`.
  Cada procedimento é gravado com **snapshot** de nome/preço/duração (histórico p/ o financeiro).
- **Bloqueio de agenda** (`/block`): reserva um intervalo do profissional sem cliente.
- **Conflito de horário**: um profissional não pode ter dois registros sobrepostos (409).
- **Retorno** (`/:id/return`): escolhe procedimentos + nova data → cria um novo agendamento
  ligado à origem (`parentId`); a origem fica `COMPLETED` (serviço realizado).
- **Status**: `SCHEDULED` (agendado), `DEPOSIT_PAID` (sinal pago), `COMPLETED` (concluído), `RETURN`.

O snapshot financeiro (`subtotal`, `feeRate`, `feeAmount`, `netAmount`...) é gravado tanto no
agendamento quanto na comanda, via `payment.config.ts` (taxas centralizadas).

### Procedimentos

Serviços do salão: `name`, `description` (opc), categoria (CRUD próprio em
`/api/procedure-categories`), `durationMinutes` (**duração em minutos** — usada no
cálculo da agenda/calendário) e `price`.

```json
POST /api/procedures
Authorization: Bearer <access_token>
{
  "name": "Escova Progressiva",
  "categoryId": "<uuid-da-categoria>",
  "durationMinutes": 90,
  "price": 150.0
}
```

### Produtos — estoque volumétrico

Cada produto tem `quantityPerUnit` por embalagem (`measureUnit` = `ML` ou `G`) e um `type`
(`INTERNAL_USE` uso interno / `SALE` venda). No cadastro, `usableQuantity` é inicializada em
`unitsInStock × quantityPerUnit` (ex.: 1 × 1000ml = 1000ml).

- **Consumo** (via comanda) subtrai da `usableQuantity`; **reposição** (`/restock`) soma.
- `unitsInStock` é **derivado**: `ceil(usableQuantity / quantityPerUnit)` — mantido coerente
  automaticamente em consumo, estorno e reposição. Por isso não é editável no `PATCH`.

```json
POST /api/products
Authorization: Bearer <access_token>
{
  "name": "Coloração 7.0 Louro Médio",
  "categoryId": "<uuid-da-categoria>",
  "type": "INTERNAL_USE",
  "price": 0,
  "unitsInStock": 1,
  "quantityPerUnit": 1000,
  "measureUnit": "ML"
}
```

### Exemplo — cadastro de cliente (admin autenticado)

```json
POST /api/clients
Authorization: Bearer <access_token>
{
  "fullName": "Morgana Lefay",
  "birthDate": "1995-06-21",
  "phone": "+5511988887777",
  "email": "morgana@exemplo.com",       // opcional
  "address": "Rua das Bruxas, 13",        // opcional
  "notes": "Alérgica a henna."            // opcional
}
```

## Segurança

- **Helmet** (headers de segurança) + **CORS por allowlist** (`CORS_ORIGINS`, separada por vírgula).
- **Rate limiting** em 2 camadas (burst 10/s + 100/min) via `@nestjs/throttler`, com limites mais
  rígidos em login (5/min), forgot-password (3/min) e reset-password (5/min) — anti brute-force.
- **Validação estrita** global (`whitelist` + `forbidNonWhitelisted` + `forbidUnknownValues`):
  campos extras no corpo são rejeitados (anti mass-assignment / fuzzing de Burp).
- **Limite de payload** 2mb (mitiga DoS por corpo grande) e **trust proxy** (`TRUST_PROXY`) para
  IP real do cliente no rate limit atrás de proxy.
- **Filtro global de exceções do Prisma**: erros do banco viram respostas limpas, sem vazar
  colunas/SQL/stack.
- **Swagger** exposto só fora de produção (ou `SWAGGER_ENABLED=true`).
- Login e forgot-password com **verificação de tempo constante** (mitiga enumeração por timing).
- Prisma parametriza todas as queries (sem SQL raw) → sem SQL injection.
- Senhas com **argon2id** (19 MiB, 2 iterações) — mesmos parâmetros no app e no seed.
- Refresh tokens **hasheados** no banco, com **rotação** e detecção de reuso (revoga a família).
- Login com verificação em tempo constante (mitiga enumeração de e-mails).
- Guard JWT **global** — rotas são protegidas por padrão; use `@Public()` para abrir.
- Autorização por papel (`@Roles(Role.ADMIN)` + `RolesGuard`).
- **Esqueci minha senha**: código de **6 dígitos** (hash argon2id, uso único, expira em
  `PASSWORD_RESET_TTL_MINUTES`) enviado por e-mail via **API Brevo**. `forgot-password` responde
  genericamente (não revela se o e-mail existe); `reset-password` troca a senha e derruba todas
  as sessões. Sem `BREVO_API_KEY` em dev, o código é logado no console.

## Tarefas agendadas (cron / BullMQ)

- **Aniversários**: todo dia 1º às 06:00 (America/Sao_Paulo) um job gera os lembretes de
  aniversário do mês (`src/reminders/birthdays.scheduler.ts`). Idempotente. Também dá para
  disparar sob demanda via `POST /api/reminders/generate-birthdays`. Requer Redis no ar.

## Estrutura

```
src/
├── auth/            # login, tokens, guards, strategies, decorators
├── users/           # usuários do sistema (admin)
├── clients/         # CRUD de clientes do salão
├── categories/      # CRUD de categorias de produtos
├── products/        # CRUD de produtos (estoque volumétrico)
├── procedure-categories/  # CRUD de categorias de procedimento
├── procedures/      # CRUD de procedimentos (duração + preço)
├── appointments/    # agenda: atendimentos, bloqueios, retornos, taxas, sinal
├── comandas/        # comanda: procedimentos + consumo de produtos + fechamento
├── financial/       # plano de contas, lançamentos, metas, fluxo de caixa
├── evaluations/     # ficha de avaliação / anamnese (prontuário histórico)
├── reminders/       # lembretes/tarefas + aniversários automáticos
├── analytics/       # métricas: resumo do período, top clientes
├── mail/            # envio de e-mail transacional (Brevo)
├── prisma/          # PrismaService (módulo global)
├── queue/           # BullMQ (fila de notificações + processor)
├── config/          # validação das variáveis de ambiente
├── app.module.ts
├── app.controller.ts
└── main.ts
prisma/
├── schema.prisma    # User, RefreshToken, Client, Category, Product, ProcedureCategory,
│                    #   Procedure, Appointment, AppointmentProcedure, Comanda,
│                    #   ComandaProcedure, ComandaProduct, FinancialAccount,
│                    #   FinancialEntry, FinancialGoal, ClientEvaluation, Reminder (+ enums)
└── seed.ts          # cria/garante o administrador
```

## Papéis (`Role`) — apenas para `User` (operadores do sistema)

- `ADMIN` — administração (usuário inicial via seed)
- `STAFF` — reservado para operadores/recepção (evoluções futuras)
