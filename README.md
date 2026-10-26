# Hand · Gestão de Projetos

Ferramenta de gestão semanal dos projetos de Gestão Compartilhada da Hand: iniciativas trimestrais, marcos mensais, tarefas semanais, fechamento, expurgos, extraprojeto, indicadores e one-page para o cliente.

- **Hospedagem:** Render.com (site estático, sem servidor)
- **Banco de dados:** Firebase Cloud Firestore (tempo real)
- **Login:** Firebase Authentication — **Google** ou **e-mail e senha** (com confirmação de e-mail), em `login.html`
- **Controle de acesso:** só entra quem estiver na coleção `autorizados` com `ativo: true`. Cadastros e aprovações são exclusivos do perfil `gestor` (regras em `firestore.rules`).

## Estrutura

```
├── public/                 ← o que o Render publica
│   ├── index.html          ← ferramenta (exige sessão; sem sessão vai para login.html)
│   ├── login.html          ← tela de login
│   ├── css/style.css
│   └── js/
│       ├── firebase-config.js   ← GERADO no build a partir das variáveis de ambiente
│       ├── firebase.js          ← inicialização compartilhada do Firebase
│       ├── login.js             ← Google, e-mail/senha, confirmação, autorização
│       ├── app.js               ← sessão + Firestore em tempo real (módulo)
│       ├── data.js              ← regras de negócio (handlers) e persistência
│       ├── metrics.js           ← cálculo dos indicadores
│       ├── ui.js                ← telas
│       └── assets.js            ← logos, fotos e marca (base64)
├── scripts/gerar-config.js ← lê FIREBASE_* (Render ou .env) e gera o firebase-config.js
├── .env.example            ← modelo das variáveis
├── package.json
├── firestore.rules         ← regras de segurança do banco
├── firestore.indexes.json
├── firebase.json           ← para publicar as regras pela CLI (opcional)
└── render.yaml             ← blueprint do Render (opcional)
```

Sem configuração do Firebase (`apiKey` vazio):
- em **localhost**, a ferramenta abre em **modo local**, com dados de demonstração gravados só no navegador. Serve para testar as telas sem banco;
- **em produção**, aparece a tela "Firebase não configurado". O site nunca cai em modo local escondido, porque nesse modo cada aparelho teria a própria cópia dos dados e nada sincronizaria.

---

## Passo a passo

### 1. Criar o projeto no Firebase

> Use uma conta Google **da Hand** (não pessoal): o banco vai guardar informações de clientes.

1. Acesse <https://console.firebase.google.com> → **Adicionar projeto** → nome `hand-gestao-projetos`.
2. Google Analytics: pode **desativar**.
3. O plano gratuito (**Spark**) é suficiente para 4 a 10 usuários.

### 2. Criar o banco Firestore

1. Menu **Criação → Firestore Database → Criar banco de dados**.
2. Local: **`southamerica-east1` (São Paulo)**. Essa escolha não pode ser mudada depois.
3. Modo: **produção**.
4. Aba **Regras**: apague o conteúdo, cole o arquivo `firestore.rules` inteiro e clique em **Publicar**.

### 3. Ativar os métodos de login

1. Menu **Criação → Authentication → Vamos começar**.
2. Aba **Método de login**:
   - **E-mail/senha** → ative **E-mail/senha**. A opção "Link de e-mail" pode ficar desativada, porque não é usada.
   - **Google** → ative e escolha o **e-mail de suporte do projeto** (obrigatório).
3. **Salvar**.

> **Google × e-mail da Hand:** "Entrar com Google" só funciona para endereços que são conta Google (Gmail ou Google Workspace). Se o `@handgc.com.br` estiver no Microsoft 365, use **Criar acesso** com e-mail e senha. Em qualquer caso, só entra quem estiver em `autorizados`.

### 4. Registrar o app web e copiar a configuração

1. Engrenagem ⚙ → **Configurações do projeto** → em "Seus apps", clique no ícone **`</>`** (Web).
2. Apelido: `gestao-projetos`. **Não** marque Firebase Hosting. Clique em **Registrar app**.
3. Guarde os valores do objeto `firebaseConfig`. Eles viram **variáveis de ambiente**:

| Variável | Campo do `firebaseConfig` |
|---|---|
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `FIREBASE_APP_ID` | `appId` |

- **No Render:** cadastre-as no passo 7.
- **No computador:** copie `.env.example` para `.env` e preencha. O `.env` está no `.gitignore` e não vai para o GitHub.

> Site estático não tem servidor, então o Render usa as variáveis **apenas no build**: o script `scripts/gerar-config.js` grava os valores em `public/js/firebase-config.js`, que é publicado junto com o site. A configuração web do Firebase é pública por natureza (o navegador precisa dela). O `.env` evita deixar esses valores fixos no repositório e permite trocar de projeto sem mexer no código. **Quem protege os dados são as regras do Firestore.**

### 5. Autorizar o primeiro gestor (manual, uma única vez)

No **Firestore → Dados → Iniciar coleção**:

| Campo | Valor |
|---|---|
| ID da coleção | `autorizados` |
| ID do documento | `alessandro.oliveira@handgc.com.br` (**minúsculas**) |
| `email` (string) | `alessandro.oliveira@handgc.com.br` |
| `perfil` (string) | `gestor` |
| `ativo` (boolean) | `true` |

Os demais consultores **não** são cadastrados aqui: o gestor faz isso pela própria ferramenta (passo 10).

### 6. Subir o código para o GitHub

Crie um repositório **privado** (ex.: `hand-gestao-projetos`) e, na pasta do projeto:

```bash
git init
git add .
git commit -m "Gestão de Projetos Hand v1"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/hand-gestao-projetos.git
git push -u origin main
```

### 7. Publicar no Render

1. Acesse <https://dashboard.render.com> → **New + → Static Site**.
2. Conecte a conta do GitHub e selecione o repositório.
3. Preencha:
   - **Name:** `hand-gestao-projetos`
   - **Branch:** `main`
   - **Build Command:** `node scripts/gerar-config.js`
   - **Publish Directory:** `public`
4. Em **Advanced → Environment Variables** (ou depois, na aba **Environment**), adicione as 6 variáveis `FIREBASE_*` da tabela do passo 4. Dica: **Add from .env** permite colar o conteúdo do seu `.env` de uma vez.
5. **Create Static Site**. Em cerca de 1 minuto o site fica disponível em `https://hand-gestao-projetos.onrender.com` (o nome pode variar).

> Alternativa: **New + → Blueprint**, apontando para o repositório. O Render lê o `render.yaml` e pede os valores das variáveis.
>
> Ao alterar uma variável depois, faça **Manual Deploy → Clear build cache & deploy**: o valor só entra no site após um novo build.
>
> Se o log do build mostrar `MODO LOCAL`, a variável `FIREBASE_API_KEY` não foi cadastrada.

### 8. Liberar o domínio do Render no Firebase

**Authentication → Configurações → Domínios autorizados → Adicionar domínio** → `hand-gestao-projetos.onrender.com` (exatamente o domínio que o Render gerou).

Sem isso, o login com Google falha com `auth/unauthorized-domain`, e os links de confirmação de e-mail e de redefinição de senha não voltam para o site.

### 9. Primeiro acesso

1. Abra o site. Sem sessão, ele vai para `login.html`.
2. Entre com **Google** ou use **Criar acesso** (e-mail + senha). No segundo caso, confirme o e-mail pelo link recebido e clique em **Já confirmei**.
3. Na tela "Primeiro acesso", clique em **Inicializar base**. O sistema cria os 9 clientes, 9 projetos, consultores e tipos de tarefa, **sem dados de demonstração**.

### 10. Liberar os consultores

**Cadastros → Consultores → Editar** → preencha o e-mail de cada um (Bernardo, Júlia, Áureo). Ao salvar, a ferramenta grava automaticamente o acesso em `autorizados`. Cada consultor então entra com Google ou cria o próprio acesso (e-mail + senha) em `login.html`. Para bloquear alguém, desmarque **Ativo**.

### 11. Atualizações

Cada `git push` na branch `main` publica a nova versão automaticamente no Render.

---

## Testar no computador

Os módulos JavaScript não funcionam abrindo o arquivo com duplo clique (`file://`). Use um servidor local:

```bash
cp .env.example .env            # preencha os valores
npm run dev                     # gera a config e sobe em http://localhost:8080
```

Sem Node: `python3 -m http.server 8080` dentro de `public/` (roda em modo local ou com o `firebase-config.js` gerado anteriormente).

Depois acesse <http://localhost:8080>. Para usar o Firebase localmente, adicione `localhost` em **Domínios autorizados** (geralmente já vem).

## Backup

Em **Cadastros → Dados → Exportar JSON**. Faça uma vez por semana, após a reunião de segunda. A importação substitui a base inteira e só o gestor pode fazê-la. O backup automático do Firestore exige o plano pago (Blaze).

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela "Firebase não configurado" | `FIREBASE_API_KEY` não cadastrada no Render, ou deploy feito antes de cadastrar. Confira a aba Environment e rode **Clear build cache & deploy** |
| Dados diferentes no celular e no computador | Site rodando em modo local (versão anterior). Publique esta versão e configure as variáveis |
| Build falha com "Variáveis faltando" | `FIREBASE_API_KEY` definida, mas alguma das outras 5 ficou vazia |
| `auth/unauthorized-domain` no Google | Domínio do Render não incluído no passo 8 |
| "Este método de login não está ativado" | Provedor Google ou E-mail/senha desligado no passo 3 |
| Janela do Google não abre (celular) | Pop-up bloqueado: libere pop-ups para o site. Em navegadores embutidos (Instagram, WhatsApp), abra o link no Chrome ou no Safari |
| E-mail de confirmação não chega | Caixa de spam; use **Reenviar e-mail** |
| "não está autorizado" | Documento em `autorizados` com ID diferente do e-mail (maiúsculas, espaço) ou `ativo` falso |
| "autorizado, mas não há consultor ativo" | Existe `autorizados/{email}`, mas nenhum consultor com esse e-mail em Cadastros |
| "Sem permissão para esta operação" | Regras não publicadas, ou ação de gestor feita por consultor |

## Recomendações de segurança

- Repositório GitHub **privado**.
- No Google Cloud Console (mesmo projeto) → **APIs e serviços → Credenciais** → restrinja a chave de API a **referenciadores HTTP**: o domínio do Render e `localhost`.
- O teste das regras foi feito com um Firebase simulado. Antes de liberar o time, valide-as no **Rules Playground** do Firestore: um consultor lendo `tarefas` (permitido), um consultor gravando em `clientes` (negado) e um e-mail fora de `autorizados` lendo qualquer coleção (negado).

## Limitações conhecidas (v1)

- A aprovação de expurgo é protegida nas regras (só o gestor grava `expurgo.status = aprovado/recusado`). As demais validações de negócio (comentário obrigatório, vínculo tarefa → marco) estão no cliente, não nas regras.
- Edições simultâneas no mesmo registro: prevalece a última gravação.
- O registro de alterações mostra os 300 eventos mais recentes.
