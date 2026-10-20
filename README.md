# Meu Bolso | Controle de Gastos

Um site responsivo para organizar as finanças pessoais, feito com HTML, CSS e JavaScript puro.

## Funcionalidades

- Registrar **entradas e saídas**, com categoria, data e observações
- Editar e excluir lançamentos
- Visualizar **saldo acumulado** até o mês selecionado e receitas e despesas mensais
- Acompanhar gráficos dos últimos 6 meses e despesas por categoria
- Definir **limites mensais de gastos** por categoria
- Gerenciar **Contas da casa**: parcela do apartamento (R$ 625 por mês), condomínio (R$ 180), gás, luz e água; marcar como pagas e controlar os valores mês a mês
- Acompanhar **Quem me deve**, **Minhas dívidas** e **Dívidas da Bianca**: valor total, pago/recebido, saldo restante, pagamentos parciais, edição e exclusão
- Pesquisar e filtrar lançamentos
- Alternar entre temas claro e escuro
- Exportar CSV e fazer backup/restauração em JSON
- Layout adaptado para celular e computador

## Como usar no VS Code

1. Baixe ou clone o repositório.
2. Abra o arquivo `index.html` no navegador (ou use uma extensão como Live Server).
3. Selecione o mês desejado e clique em **Novo lançamento** para começar.

Não há instalação de dependências, cadastro ou banco de dados.

## Como publicar com GitHub Pages

1. No GitHub, abra **Settings → Pages** neste repositório.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Escolha a branch **main** e a pasta **/(root)**, e salve.
4. Quando o GitHub concluir o deploy, a página normalmente estará em:
   https://lohanrosha02-gif.github.io/controle-gastos/

**Importante:** colocar os arquivos no GitHub não ativa automaticamente o GitHub Pages. O endereço acima só funcionará depois da ativação e da publicação.

## Privacidade e segurança dos seus dados

Sem configuração Supabase, os registros continuam no **localStorage** do navegador. Com o Supabase configurado e o usuário autenticado, os dados são armazenados em uma tabela privada protegida por Row Level Security (RLS), acessível apenas à conta. O código deste repositório é público, mas não contém dados financeiros dos usuários.

- Sem o Supabase configurado ou sem login, os dados não sincronizam entre computadores, celulares e navegadores.
- Limpar os dados do navegador ou usar modo anônimo pode apagá-los.
- Faça backups em **Meus dados → Backup JSON** e guarde o arquivo em local seguro.
- Restaurações de backup substituem os dados locais existentes.
- Os limites por categoria são os mesmos em todos os meses.
- Os valores das contas da casa são tratados mês a mês. Apenas contas marcadas como pagas entram automaticamente nas despesas e gráficos, sem criar lançamentos repetidos.
- Os registros de dívidas e cobranças são controles auxiliares e **não afetam automaticamente o saldo financeiro** para evitar contagem dupla. Registre no menu Lançamentos a entrada ou saída real, se desejar refletir os pagamentos no seu saldo.
- O backup JSON inclui contas da casa e dívidas; o CSV inclui os lançamentos financeiros e as contas da casa pagas, mas não os cadastros de dívidas.
- Nenhuma dívida pessoal, nome de devedor ou valor particular foi adicionado ao código público. Você preenche esses dados no site, e eles permanecem no seu navegador.

## Estrutura

```
controle-gastos/
├── index.html           # Interface e controle financeiro local
├── cloud-sync.js        # Login e sincronização privada
├── supabase-config.js   # URL e chave pública do projeto (começa vazio)
├── supabase-schema.sql  # Tabela, políticas de segurança e gravação segura
└── README.md            # Instruções de uso e publicação
```

## Licença

Uso pessoal. Nenhuma licença de distribuição adicional foi definida.


## Sincronização entre todos os dispositivos (Supabase)

O recurso foi **implementado no site, mas não está ativado enquanto a configuração estiver vazia**. Instalar o plugin Supabase no ChatGPT não cria automaticamente a tabela e não conecta este site ao seu projeto.

**Passos para ativar:**

1. Crie ou escolha seu projeto em [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor**, cole todo o conteúdo de **supabase-schema.sql** e execute. A tabela armazena um JSON privado por usuário; as políticas RLS bloqueiam o acesso de outros usuários; a função de gravação usa versão para evitar sobrescrita sem aviso.
3. Nas configurações do projeto Supabase, copie a **Project URL** e a **Publishable key** (ou chave anon pública). Cole em **supabase-config.js** como os campos url e publishableKey. A chave service_role, sb_secret_ e senhas **nunca devem ser publicadas**.
4. Em **Authentication → URL Configuration**, configure **Site URL** como https://lohanrosha02-gif.github.io/controle-gastos/ e inclua essa URL em **Redirect URLs**. Se usar outros domínios, inclua-os também.
5. Em **Authentication → Providers → Email**, ative o acesso por e-mail (link mágico/OTP). Configure SMTP apropriado se necessário para entrega de e-mails.
6. Publique a alteração no GitHub Pages. Abra o site em cada dispositivo, vá a **Meus dados → Sincronizar em todos os dispositivos** e entre com o **mesmo e-mail**.
7. Na primeira sincronização, se já houver registros locais, escolha **Enviar dados deste dispositivo**. Em outro aparelho com dados da nuvem, use **Usar dados da nuvem**.

**Como funciona:** dados sincronizados incluem lançamentos, limites, contas da casa, pagamentos de gás/luz/água, valores fixos de apartamento e condomínio, e dívidas/cobranças com histórico de pagamentos. Depois da primeira importação, alterações locais são enviadas automaticamente quando há sessão válida e internet. O site consulta a nuvem ao abrir, ao voltar à aba e periodicamente enquanto aberto. Desconexões mantêm alterações no navegador para enviar mais tarde.

**Conflitos e segurança:** caso outro aparelho tenha modificado os dados, a gravação é bloqueada pelo controle de versões. O site permite escolher conscientemente entre a cópia local e a nuvem, depois de guardar uma cópia de recuperação no navegador. Os dados não se sincronizam quando o site está fechado, e alterações simultâneas podem exigir essa decisão. Não use contas compartilhadas com pessoas que não devem ver seus dados.

O site mantém backup JSON manual como proteção adicional.
