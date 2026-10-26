# Modelo de Gestão de Projetos — Gestão Compartilhada (v1)

Arquivo: hand-gestao-projetos-v1.html (single-file, dados no navegador; camada `invoke('gp.<entidade>.<ação>')` pronta para trocar por backend).

## Estrutura
Cliente > Projeto (frente) > Iniciativa (objetivo trimestral, dono) > Marco mensal (entrega verificável) > Tarefa semanal (responsável único + participantes). Vínculo obrigatório; tarefa sem marco não existe.

## Projetos e equipe (out/2026)
AV Avec (Bernardo resp., Áureo) · CD Conduscamp (Júlia) · DM Dismotor (Bernardo) · HG Hidrogood (Júlia) · RC Rivicci (Júlia) · FB Flamboiã (Bernardo) · SCT Scitech (Alessandro, provisório) · LP Life Biological e Pragas.com (Júlia) · JN Jonasi (Bernardo). Gestor: Alessandro.

## Regras decididas
- Indicadores: Confiabilidade (horas-porte concluídas ÷ planejadas) e Avanço (marcos no prazo ÷ marcos vencidos). Não afetam remuneração nesta fase; gestor media compromissos.
- Porte: P ≤4h (4), M 4–12h (8), G 12–24h (18); acima disso, quebrar.
- Expurgo: demanda da gestão Hand ou demanda nova do cliente que concorre com o plano → pedido de expurgo, aprovado pelo gestor (autoaprovação visível). Dependência do cliente NÃO é expurgada, mas aparece no one-page. Expurgos alimentam painel de interferência.
- Extraprojeto: registrado com horas e solicitante. Sem capacidade semanal declarada.
- Reprogramação: contador por tarefa e por marco; alertas ↻≥2 e ↻≥3.
- Presença: presencial no cliente ou presencial na Hand com cliente; online = interação. Meta 3/mês por projeto; agenda com 2 consultores = 1 presença.
- Indicador do gestor: participação nas interações com cliente por projeto/consultor, dias desde a última; projetos conduzidos pelo gestor separados.
- Rituais: fechamento sexta 19h (pode concluir na reunião de segunda); segunda = planejamento.
- One-page semanal, PDF anexo ao e-mail, gerado e enviado pelo consultor; opção A (template estruturado, sem IA); aprovação do gestor nas primeiras semanas. Não mostra reprogramações nem dados internos.
- Visibilidade: todos veem tudo. Login futuro: link por e-mail (Supabase Auth), lista de e-mails autorizados.

## Pendências
- E-mails dos consultores; consentimento LGPD para fotos.
- Publicação: GitHub + Vercel + Supabase (ou padrão HandHub/Cuore).