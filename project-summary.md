# Project Summary — bookmark-manager

## O que o projeto faz

O **bookmark-manager** é uma REST API em Node.js (Express + TypeScript) para gerenciar favoritos (bookmarks). Ela suporta criação, leitura, atualização e exclusão de bookmarks com campos de título, URL, descrição e tags, além de filtros por tag, busca textual, paginação e ordenação. Os dados são persistidos em um arquivo JSON local e validados com a biblioteca Zod.

---

## Ferramentas observadas durante a exploração

| Ferramenta | O que Claude fez com ela |
|---|---|
| **Read** | Abriu e leu os arquivos `src/index.ts`, `src/app.test.ts`, `src/types.ts`, `package.json` e `build-evidence.md` para entender a estrutura e o código do projeto |
| **Glob** | Buscou todos os arquivos do projeto com o padrão `**/*` para ter uma visão geral da estrutura de diretórios |
| **Bash** | Executou `git diff HEAD` para inspecionar mudanças pendentes antes de propor qualquer alteração; executou `npm test` (33/33 passando) para confirmar que nada quebrou; executou `npm pkg get description` para verificar que o campo foi gravado com o valor correto |
| **Edit** | Modificou `package.json` para adicionar o campo `description` que estava faltando |
