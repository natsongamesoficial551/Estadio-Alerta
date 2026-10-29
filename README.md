# Estádio Alerta — Arena CVG

Maquete interativa em Next.js de um estádio fictício, criada para o trabalho escolar sobre ODS 9, infraestrutura e segurança.

## Abrir o projeto

Requer Node.js 20.9 ou superior e npm.

```powershell
npm install
npm run dev
```

Abra http://localhost:3000. Para gerar a versão de produção, use `npm run build`. O site completo será gerado na pasta `out`, que pode ser servida por uma hospedagem estática. Para verificar os tipos, use `npm run typecheck`.

## Publicação no Netlify

Conecte a branch `main` deste repositório. O arquivo `netlify.toml` define o comando `npm run build`, a pasta de publicação `out` e o Node.js 22. O simulador roda no navegador e não precisa de funções no servidor. Após alterações no GitHub, o Netlify pode publicar automaticamente uma nova versão.

## Primeira etapa

- Estádio elíptico com dois níveis de arquibancadas, cadeiras e milhares de torcedores.
- Campo de 105 × 68 m, gols, redes, bancos de reservas e painéis.
- Duas equipes de 11 jogadores, árbitro e bola com movimento demonstrativo.
- Cobertura removível com estrutura, fachada, praça, árvores e cidade ao redor.
- Quatro perspectivas, câmera orbital, aproximação e ambientes diurno e noturno.
- Interface adaptada para celular, ajuda, tela cheia e controles de público e animação.

Arraste para girar e use a roda do mouse para aproximar. No celular, arraste com um dedo e aproxime com dois.

## Construção e limites

Next.js, React, TypeScript, Three.js, React Three Fiber e Drei. Geometria, personagens e texturas do estádio são gerados por código; não há modelos 3D comerciais. A direção visual usa materiais, luz e sombras em tempo real, com detalhes simplificados para rodar no navegador. Esta versão é uma maquete arquitetônica, ainda sem acabamento fotorrealista. Requer WebGL 2 e aceleração gráfica.

Os 48.000 lugares indicam a capacidade conceitual do projeto. O público renderizado é uma representação reduzida. A partida é uma animação visual, sem simulação completa das regras do futebol. As fontes da interface podem usar Google Fonts; a cena 3D não depende de downloads de modelos nem de fontes externas.

## Simulação de segurança

A segurança permanece visível na exploração normal: 16 setores, de B01 a B16, possuem uma câmera, um totem com botão de emergência e uma dupla de agentes no corredor intermediário. As placas identificam o setor, a câmera, o botão e a equipe. A perspectiva **Segurança** aproxima a câmera de um posto sem iniciar ocorrência. Os equipamentos usam geometria instanciada para reduzir as chamadas de desenho; não há luzes adicionais por posto. Durante a ocorrência, o posto B12 é substituído pelos elementos animados do atendimento, sem duplicar seus agentes ou equipamentos.

Clique em **Simular ocorrência** para acompanhar uma discussão entre dois torcedores no setor B12. A demonstração mostra a câmera C-12 sinalizando uma suspeita, um torcedor acionando o botão E-12 e a confirmação humana antes do envio de dois agentes. Os agentes percorrem o corredor e a escada, separam os envolvidos e encerram o atendimento.

As três primeiras etapas avançam automaticamente a cada seis segundos. É possível pausar ou avançar para apresentar cada etapa. Em **Confirmação humana**, a sequência aguarda o clique em **Confirmar e enviar equipe**; o deslocamento dura oito segundos. Ao finalizar, é possível reiniciar ou encerrar a demonstração. A câmera continua livre para exploração com o mouse.

A cena usa personagens e eventos programados, com tempos acelerados. Não executa reconhecimento real por IA, não analisa pessoas e não envia alertas externos. É uma representação didática da proposta do grupo.

## Modo preview

Clique em **Modo preview** para esconder toda a interface e explorar somente a cena 3D. A câmera, a iluminação e as opções escolhidas são mantidas. Pressione **Esc** ou dê dois cliques/toques na cena para voltar.

## Entorno urbano

A cidade usa quarteirões e ruas em grade, travessias de pedestres, calçadas, edifícios com três tipos de fachada, coberturas técnicas, arborização, carros estacionados e tráfego animado. Prédios próximos à arena são mais baixos para preservar a vista. Janelas e postes recebem iluminação noturna.

Para reduzir o custo gráfico, os edifícios são compostos de módulos instanciados, as fachadas compartilham pequenas texturas geradas no navegador e a malha viária usa uma única textura de 2048 × 2048. Não há downloads de modelos nem luzes individuais para cada janela. O desempenho depende da GPU, da resolução e do navegador; não foi estabelecida uma taxa mínima de quadros.


## Estacionamento e circulação

O estacionamento lateral tem dois setores com vagas demarcadas, áreas reservadas, ilhas para pedestres, carregadores representativos, guarita, cancelas abertas e postes. A malha viária foi refeita em camadas: calçadas nas laterais, asfalto contínuo nos cruzamentos e uma quadra exclusiva para a arena e os lotes. O plano de fundo fica abaixo do asfalto para evitar conflito de profundidade.

O tráfego contém 94 veículos em três circuitos contínuos, com duas faixas em sentidos opostos, curvas e faróis noturnos. O controle de pausa interrompe o tráfego e os jogadores. Trata-se de animação demonstrativa, sem simulação de semáforos ou decisões de motoristas. Veículos estacionados permanecem parados. A geometria do estádio foi preservada; somente o enquadramento de “Arena e cidade” foi ampliado.
