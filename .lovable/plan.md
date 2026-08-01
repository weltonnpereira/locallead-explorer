Plano para disponibilizar o código-fonte do frontend via GitHub.

## Objetivo
Permitir que o usuário baixe/clone o frontend do projeto LeadRadar conectando-o a um repositório GitHub.

## Passos
1. **Conectar o projeto ao GitHub**
   - No editor Lovable, abrir o menu Plus (+) → GitHub → Connect project.
   - Autorizar o app da Lovable no GitHub.
   - Escolher a conta/organização e criar o repositório.

2. **Sincronizar o código**
   - Após a conexão, o Lovable faz push automático do código atual para o repositório.
   - Aguardar a sincronização inicial completar.

3. **Clonar ou baixar o frontend**
   - Opção A: clonar localmente com `git clone <url-do-repo>`.
   - Opção B: baixar como ZIP pelo GitHub (Code → Download ZIP).

4. **Rodar localmente (opcional)**
   - Instalar dependências: `bun install` (ou `npm install`).
   - Iniciar o dev server: `bun dev` (ou `npm run dev`).

## Resultado esperado
O código-fonte do frontend estará disponível no GitHub e poderá ser clonado/baixado a qualquer momento, com sincronização bidirecional futura entre Lovable e GitHub.