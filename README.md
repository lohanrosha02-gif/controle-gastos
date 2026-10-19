# Meu Bolso | Controle de Gastos

Um site responsivo para organizar as finanças pessoais, feito com HTML, CSS e JavaScript puro.

## Funcionalidades

- Registrar **entradas e saídas**, com categoria, data e observações
- Editar e excluir lançamentos
- Visualizar **saldo acumulado** até o mês selecionado e receitas e despesas mensais
- Acompanhar gráficos dos últimos 6 meses e despesas por categoria
- Definir **limites mensais de gastos** por categoria
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

Os registros financeiros são armazenados apenas no **localStorage** do navegador. O aplicativo não se conecta a bancos nem envia lançamentos a servidores. O código-fonte deste repositório é público, mas os lançamentos inseridos no site **não são publicados no repositório**.

- Os dados não sincronizam entre computadores, celulares e navegadores.
- Limpar os dados do navegador ou usar modo anônimo pode apagá-los.
- Faça backups em **Meus dados → Backup JSON** e guarde o arquivo em local seguro.
- Restaurações de backup substituem os dados locais existentes.
- Os limites por categoria são os mesmos em todos os meses.

## Estrutura

```
controle-gastos/
├── index.html    # Site completo com estilos e lógica
└── README.md     # Instruções de uso e publicação
```

## Licença

Uso pessoal. Nenhuma licença de distribuição adicional foi definida.
