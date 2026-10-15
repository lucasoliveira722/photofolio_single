# Lucas Oliveira Fotografia

[English](#english) · [Português](#português)

Live site / Site no ar: https://lucasoliveirafotografia.vercel.app

---

## English

### Purpose

A portfolio website for a single photographer. Visitors browse the work by category; the photographer manages everything from a private admin area, without touching code or the database.

**Public site**
- Home page with a carousel of featured photos, a bio, and email/Instagram links
- Portfolio organized by category, in a masonry grid, with a lightbox for each photo
- A "Prints" page (coming soon)

**Admin area** (`/admin`, photographer only)
- Create, rename, reorder, and delete categories
- Upload photos in batches, by picking files or dragging them in; each photo is resized in the browser before uploading
- Reorder photos by drag and drop, edit titles and descriptions, move photos between categories, delete them
- Choose which photos appear in the home-page carousel
- Edit the bio, email, and Instagram handle shown on the home page (`/admin/profile`)

### Tools

| Area | Tools |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Cache Components, React Compiler), [React](https://react.dev) 19, [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 |
| Backend | [Supabase](https://supabase.com): Postgres database, Auth (admin sign-in), Storage (photo files), row-level security |
| Admin UI | [dnd-kit](https://dndkit.com) for drag-and-drop reordering |
| Quality | [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com), [ESLint](https://eslint.org) |
| Hosting | [Vercel](https://vercel.com) |

There is no separate API server: the site reads Supabase from server code, and the admin writes through Next.js server actions. Row-level security lets everyone read, and lets only accounts listed in the `admins` table write.

### Repository layout

```
front/photofolio/   The Next.js site (public pages and the admin area)
supabase/           Database scripts and the photo seed script (not deployed)
  schema.sql        Tables
  policies.sql      Row-level security and helper functions
```

Each part is installed and run from its own folder; there is no root `package.json`.

### Installation

**Requirements:** [Node.js](https://nodejs.org) 20.9 or newer, npm, and a free [Supabase](https://supabase.com) account.

#### 1. Set up Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run the whole of `supabase/schema.sql`, then the whole of `supabase/policies.sql`. The policies script is safe to run again later.
3. In **Storage**, create a **public** bucket named `portfolio-images`.
4. In **Authentication → Users**, add the photographer's account (email and password).
5. Make that account the admin. Copy its user id and run in the SQL Editor:
   ```sql
   insert into admins (user_id) values ('<the user id>');
   ```
   There is no sign-up page; this row is the only way to become an admin. You can also turn off "Allow new users to sign up" under **Authentication → Sign In / Providers**.

#### 2. Run the site locally

```bash
cd front/photofolio
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your project URL and **publishable** key (Supabase → **Project Settings → API Keys**). The same values go in both the plain and the `NEXT_PUBLIC_` variables.

```bash
npm run dev     # http://localhost:3000 (admin at /login)
npm test        # run the tests
npm run lint    # check the code
npm run build   # production build
```

#### 3. Optional: add photos from a folder

The admin is the usual way to add photos. To load a whole folder at once, use the seed script. It uses the **service-role key**, which bypasses row-level security, so keep it only on your machine.

```bash
cd supabase
npm install
cp .env.example .env    # SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run seed -- --category=<slug> --dir=<folder> --name="<Category Name>"
```

`--name` is needed only when the category doesn't exist yet. The script uploads files as they are, without resizing them.

#### 4. Deploy to Vercel

1. Import the repository in Vercel and set **Root Directory** to `front/photofolio`.
2. Add the four variables from `.env.local`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Never** add the service-role key to Vercel.
3. Deploy. Every push to `main` deploys again.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to the site's address.

If you change `supabase/schema.sql`, apply the change in the SQL Editor and run `npm run gen:types` in `front/photofolio` to update the TypeScript types (this needs `npx supabase login` once).

---

## Português

### Objetivo

Um site de portfólio para um único fotógrafo. Os visitantes navegam pelo trabalho por categoria; o fotógrafo gerencia tudo por uma área administrativa privada, sem mexer em código nem no banco de dados.

**Site público**
- Página inicial com um carrossel de fotos em destaque, uma bio e links de email e Instagram
- Portfólio organizado por categoria, em grade estilo mosaico, com visualização ampliada de cada foto
- Uma página de "Prints" (em breve)

**Área administrativa** (`/admin`, apenas o fotógrafo)
- Criar, renomear, reordenar e excluir categorias
- Enviar fotos em lote, escolhendo os arquivos ou arrastando-os; cada foto é redimensionada no navegador antes do envio
- Reordenar fotos arrastando, editar títulos e descrições, mover fotos entre categorias, excluí-las
- Escolher quais fotos aparecem no carrossel da página inicial
- Editar a bio, o email e o Instagram exibidos na página inicial (`/admin/profile`)

### Ferramentas

| Área | Ferramentas |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Cache Components, React Compiler), [React](https://react.dev) 19, [TypeScript](https://www.typescriptlang.org) |
| Estilo | [Tailwind CSS](https://tailwindcss.com) 4 |
| Backend | [Supabase](https://supabase.com): banco Postgres, Auth (login do admin), Storage (arquivos das fotos), segurança por linha (row-level security) |
| Interface do admin | [dnd-kit](https://dndkit.com) para reordenar arrastando |
| Qualidade | [Vitest](https://vitest.dev) e [Testing Library](https://testing-library.com), [ESLint](https://eslint.org) |
| Hospedagem | [Vercel](https://vercel.com) |

Não há um servidor de API separado: o site lê o Supabase a partir do código do servidor, e o admin grava por meio de server actions do Next.js. A segurança por linha permite que qualquer pessoa leia e que só as contas listadas na tabela `admins` gravem.

### Estrutura do repositório

```
front/photofolio/   O site em Next.js (páginas públicas e área administrativa)
supabase/           Scripts do banco e o script de carga de fotos (não vai para produção)
  schema.sql        Tabelas
  policies.sql      Segurança por linha e funções auxiliares
```

Cada parte é instalada e executada a partir da sua própria pasta; não há `package.json` na raiz.

### Instalação

**Requisitos:** [Node.js](https://nodejs.org) 20.9 ou mais recente, npm e uma conta gratuita no [Supabase](https://supabase.com).

#### 1. Configurar o Supabase

1. Crie um projeto no Supabase.
2. No **SQL Editor**, execute todo o `supabase/schema.sql` e depois todo o `supabase/policies.sql`. O script de políticas pode ser executado de novo sem problemas.
3. Em **Storage**, crie um bucket **público** chamado `portfolio-images`.
4. Em **Authentication → Users**, adicione a conta do fotógrafo (email e senha).
5. Torne essa conta admin. Copie o id do usuário e execute no SQL Editor:
   ```sql
   insert into admins (user_id) values ('<o id do usuário>');
   ```
   Não há página de cadastro; essa linha é a única forma de virar admin. Você também pode desativar "Allow new users to sign up" em **Authentication → Sign In / Providers**.

#### 2. Rodar o site localmente

```bash
cd front/photofolio
npm install
cp .env.example .env.local
```

Preencha o `.env.local` com a URL do projeto e a chave **publishable** (Supabase → **Project Settings → API Keys**). Os mesmos valores vão nas variáveis comuns e nas `NEXT_PUBLIC_`.

```bash
npm run dev     # http://localhost:3000 (admin em /login)
npm test        # roda os testes
npm run lint    # verifica o código
npm run build   # build de produção
```

#### 3. Opcional: adicionar fotos de uma pasta

O admin é a forma normal de adicionar fotos. Para carregar uma pasta inteira de uma vez, use o script de carga. Ele usa a **service-role key**, que ignora a segurança por linha, então mantenha essa chave só no seu computador.

```bash
cd supabase
npm install
cp .env.example .env    # SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm run seed -- --category=<slug> --dir=<pasta> --name="<Nome da Categoria>"
```

O `--name` só é necessário quando a categoria ainda não existe. O script envia os arquivos como estão, sem redimensioná-los.

#### 4. Publicar na Vercel

1. Importe o repositório na Vercel e defina **Root Directory** como `front/photofolio`.
2. Adicione as quatro variáveis do `.env.local`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Nunca** adicione a service-role key na Vercel.
3. Publique. Cada push na `main` publica de novo.
4. No Supabase → **Authentication → URL Configuration**, defina a **Site URL** com o endereço do site.

Se alterar o `supabase/schema.sql`, aplique a mudança no SQL Editor e rode `npm run gen:types` em `front/photofolio` para atualizar os tipos do TypeScript (é preciso rodar `npx supabase login` uma vez).
