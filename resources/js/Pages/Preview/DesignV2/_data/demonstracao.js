/*
 * Fixtures do preview de design V2.
 *
 * Todo o conteúdo é fictício e identificável como demonstração:
 * - identificadores com prefixo DEMO- (nunca PSIDs, tokens ou anúncios reais);
 * - emails no domínio reservado `.invalid`;
 * - nomes de contas e contatos inventados;
 * - nenhuma leitura de banco, chamada à Meta ou gravação é feita a partir
 *   destes dados. Eles existem apenas para avaliar a interface.
 *
 * Os formatos seguem as estruturas reais (contato, mensagem, fluxo, etapa,
 * agendamento, convite) para que a comparação visual seja honesta.
 */

export const rotulosEstadoAgendamento = {
    pendente: 'Pendente',
    executado: 'Executado',
    cancelado: 'Cancelado',
    falhou: 'Falhou',
};

export const rotulosTipoConteudo = {
    texto: 'Texto',
    imagem: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    arquivo: 'Arquivo',
};

export const conta = {
    nome: 'Ateliê Aurora — demonstração',
    identificador: 'DEMO-CONTA-001',
    fuso: 'America/Sao_Paulo',
    fusoConfirmado: true,
    criadaEm: '2026-10-02T10:15:00-03:00',
    plano: 'Piloto assistido (demonstração)',
};

export const operador = {
    nome: 'Operador de demonstração',
    email: 'operador@exemplo.invalid',
    iniciais: 'OD',
};

export const operacao = {
    atualizadoEm: '2026-11-13T09:42:00-03:00',
    messenger: {
        conectado: true,
        pagina: 'Ateliê Aurora (demonstração)',
        pageId: 'DEMO-PAGINA-0001',
        webhook: 'Inscrição ativa',
        oauthDisponivel: false,
    },
    fila: {
        pendentes: 0,
        ultimaExecucao: '2026-11-13T09:40:00-03:00',
    },
    agendador: {
        ultimaVarredura: '2026-11-13T09:41:00-03:00',
    },
};

export const metricas = [
    { rotulo: 'Contatos atendidos', valor: 128, unidade: 'contatos', nota: 'Base de demonstração' },
    { rotulo: 'Mensagens hoje', valor: 342, unidade: 'mensagens', nota: 'Entre envios e recebidas' },
    { rotulo: 'Fluxos ativos', valor: 2, unidade: 'de 3', nota: 'Um fluxo inativo' },
    { rotulo: 'Agendamentos pendentes', valor: 2, unidade: 'na fila', nota: 'Próximo às 14:30' },
];

const mensagem = (id, direcao, texto, created_at, extras = {}) => ({
    id,
    direcao,
    texto,
    tipo_conteudo: 'texto',
    created_at,
    ...extras,
});

export const contatos = [
    {
        id: 1,
        nome: 'Ana Beatriz Almeida',
        psid: 'DEMO-PSID-1042',
        mensagens_count: 12,
        ultimaMensagemEm: '2026-11-13T09:38:00-03:00',
        naoLidas: 2,
        origem: {
            categoria: 'anuncio',
            source: 'ADS',
            ad_id: 'DEMO-AD-7781',
            ad_title: 'Coleção Primavera — demonstração',
            post_id: 'DEMO-POST-3310',
            product_id: 'DEMO-PROD-144',
            referencia: 'primavera-lancamento',
            referer_uri: 'https://exemplo.invalid/campanha/primavera',
            mensagem_inicial: 'Vi o anúncio da coleção nova. Ainda tem o vestido midi?',
        },
        mensagens: [
            mensagem(1, 'recebida', 'Oi! Vi o anúncio da coleção nova. Ainda tem o vestido midi?', '2026-11-13T09:12:00-03:00'),
            mensagem(2, 'enviada', 'Oi, Ana! Bom te ver por aqui. O vestido midi está disponível nos tamanhos P ao GG. Você prefere qual cor?', '2026-11-13T09:13:00-03:00', {
                indicadorDigitacao: 3,
            }),
            mensagem(3, 'recebida', 'Gostei do terracota e do areia. Consegue me mandar uma foto?', '2026-11-13T09:21:00-03:00'),
            mensagem(4, 'enviada', '', '2026-11-13T09:22:00-03:00', {
                tipo_conteudo: 'imagem',
                anexo_nome_original: 'demo-vestido-terracota.jpg',
                anexo_tamanho_bytes: 412_000,
            }),
            mensagem(5, 'recebida', 'Perfeito, é esse mesmo. Tem entrega para o Rio nesta semana?', '2026-11-13T09:35:00-03:00'),
            mensagem(6, 'enviada', 'Tem sim. Pedidos até quinta saem na sexta e chegam em 2 dias úteis no Rio.', '2026-11-13T09:36:00-03:00'),
            mensagem(7, 'recebida', 'Fechado, vou querer o terracota no M.', '2026-11-13T09:38:00-03:00'),
        ],
    },
    {
        id: 2,
        nome: 'Carlos Eduardo Mota',
        psid: 'DEMO-PSID-1043',
        mensagens_count: 7,
        ultimaMensagemEm: '2026-11-13T09:05:00-03:00',
        naoLidas: 0,
        origem: {
            categoria: 'link',
            source: 'SHORTLINK',
            referencia: 'bio-instagram',
            referer_uri: 'https://exemplo.invalid/bio',
        },
        mensagens: [
            mensagem(20, 'recebida', 'Bom dia, cheguei pelo link da bio.', '2026-11-13T08:51:00-03:00'),
            mensagem(21, 'enviada', 'Bom dia, Carlos! Como posso ajudar?', '2026-11-13T08:52:00-03:00'),
            mensagem(22, 'recebida', 'Queria saber se vocês fazem troca de tamanho.', '2026-11-13T09:05:00-03:00'),
        ],
    },
    {
        id: 3,
        nome: 'Fernanda Lopes',
        psid: 'DEMO-PSID-1044',
        mensagens_count: 9,
        ultimaMensagemEm: '2026-11-13T08:58:00-03:00',
        naoLidas: 1,
        origem: {
            categoria: 'anuncio',
            source: 'ADS',
            ad_id: 'DEMO-AD-7782',
            ad_title: 'Frete grátis Sudeste — demonstração',
            mensagem_inicial: 'O frete grátis vale para Campinas?',
        },
        mensagens: [
            mensagem(30, 'recebida', 'O frete grátis vale para Campinas?', '2026-11-13T08:40:00-03:00'),
            mensagem(31, 'enviada', 'Vale sim! Frete grátis para todo o Sudeste acima de R$ 199.', '2026-11-13T08:41:00-03:00'),
            mensagem(32, 'recebida', 'Ótimo. E o prazo?', '2026-11-13T08:58:00-03:00'),
        ],
    },
    {
        id: 4,
        nome: 'Gustavo Pereira',
        psid: 'DEMO-PSID-1045',
        mensagens_count: 3,
        ultimaMensagemEm: '2026-11-12T17:22:00-03:00',
        naoLidas: 0,
        origem: null,
        mensagens: [
            mensagem(40, 'recebida', 'Olá, tudo bem?', '2026-11-12T17:18:00-03:00'),
            mensagem(41, 'enviada', 'Olá, Gustavo! Tudo bem por aqui. Em que posso ajudar?', '2026-11-12T17:19:00-03:00'),
            mensagem(42, 'recebida', 'Só confirmando o horário da loja no sábado.', '2026-11-12T17:22:00-03:00'),
        ],
    },
    {
        id: 5,
        nome: 'Helena Duarte',
        psid: 'DEMO-PSID-1046',
        mensagens_count: 5,
        ultimaMensagemEm: '2026-11-12T15:44:00-03:00',
        naoLidas: 0,
        origem: {
            categoria: 'anuncio',
            source: 'ADS',
            ad_id: 'DEMO-AD-7783',
            ad_title: 'Kits de presente — demonstração',
            mensagem_inicial: 'Queria um kit de presente até R$ 250.',
        },
        mensagens: [
            mensagem(50, 'recebida', 'Queria um kit de presente até R$ 250.', '2026-11-12T15:30:00-03:00'),
            mensagem(51, 'enviada', 'Temos três opções nessa faixa. Prefere algo com acessório ou só peça de roupa?', '2026-11-12T15:32:00-03:00'),
            mensagem(52, 'recebida', 'Com acessório, por favor.', '2026-11-12T15:44:00-03:00'),
        ],
    },
    {
        id: 6,
        nome: 'Igor Salles',
        psid: 'DEMO-PSID-1047',
        mensagens_count: 4,
        ultimaMensagemEm: '2026-11-12T11:02:00-03:00',
        naoLidas: 0,
        origem: {
            categoria: 'outro',
            source: 'POSTBACK',
            referencia: 'menu-principal',
        },
        mensagens: [
            mensagem(60, 'recebida', 'Começar', '2026-11-12T10:58:00-03:00'),
            mensagem(61, 'enviada', 'Escolha um assunto: 1) Pedidos 2) Trocas 3) Atendimento humano', '2026-11-12T10:58:30-03:00'),
            mensagem(62, 'recebida', '2', '2026-11-12T11:02:00-03:00'),
        ],
    },
    {
        id: 7,
        nome: 'Juliana Reis',
        psid: 'DEMO-PSID-1048',
        mensagens_count: 6,
        ultimaMensagemEm: '2026-11-11T16:31:00-03:00',
        naoLidas: 0,
        origem: {
            categoria: 'link',
            source: 'SHORTLINK',
            referencia: 'newsletter-novembro',
        },
        mensagens: [
            mensagem(70, 'recebida', 'Recebi o e-mail da newsletter e vim conferir.', '2026-11-11T16:20:00-03:00'),
            mensagem(71, 'enviada', 'Que bom, Juliana! A pré-venda abre na sexta para quem chegou pela newsletter.', '2026-11-11T16:22:00-03:00'),
            mensagem(72, 'recebida', 'Vou aguardar. Obrigada!', '2026-11-11T16:31:00-03:00'),
        ],
    },
    {
        id: 8,
        nome: 'Marcos Vinícius',
        psid: 'DEMO-PSID-1049',
        mensagens_count: 2,
        ultimaMensagemEm: '2026-11-10T09:14:00-03:00',
        naoLidas: 0,
        origem: {
            categoria: 'anuncio',
            source: 'ADS',
            ad_id: 'DEMO-AD-7784',
            ad_title: 'Atacado mínimo 12 peças — demonstração',
            mensagem_inicial: 'Vocês vendem no atacado?',
        },
        mensagens: [
            mensagem(80, 'recebida', 'Vocês vendem no atacado?', '2026-11-10T09:10:00-03:00'),
            mensagem(81, 'enviada', 'Vendemos a partir de 12 peças. Vou te encaminhar para o time comercial.', '2026-11-10T09:14:00-03:00'),
        ],
    },
];

export const proximoContatoId = 9;

export const fluxos = [
    {
        id: 1,
        nome: 'Boas-vindas — Coleção Primavera',
        ativo: true,
        atualizadoEm: '2026-11-12T18:20:00-03:00',
        execucoes_count: 84,
        agendamentos_count: 0,
        regras: [
            { gatilho: 'novo_contato', ativo: true },
            { gatilho: 'mensagem_recebida', ativo: true },
        ],
        horario: {
            ativo: true,
            inicio: '08:00',
            fim: '18:00',
            foraHorario: 'aguardar',
        },
        etapas: [
            {
                id: 11,
                ordem: 1,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Oi, {{nome}}! Que bom te ver por aqui. Sou da equipe do Ateliê Aurora.',
                pausa_segundos: 2,
                indicador_digitacao_ativo: true,
                indicador_digitacao_segundos: 2,
            },
            {
                id: 12,
                ordem: 2,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Posso te ajudar a encontrar uma peça ou saber mais sobre a coleção nova?',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
            {
                id: 13,
                ordem: 3,
                tipo: 'condicao_horario',
                tipo_conteudo: 'texto',
                texto: '',
                condicoes: [
                    { inicio: '08:00', fim: '12:00', destino_ordem: 4 },
                    { inicio: '12:01', fim: '18:00', destino_ordem: 5 },
                ],
                destino_nao_ordem: 5,
            },
            {
                id: 14,
                ordem: 4,
                tipo: 'mensagem',
                tipo_conteudo: 'arquivo',
                texto: '',
                anexo_nome_original: 'demo-catalogo-primavera.pdf',
                anexo_tamanho_bytes: 1_840_000,
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
            {
                id: 15,
                ordem: 5,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Deixei o catálogo aqui. Se preferir, responda com o tamanho e a cor que eu verifico o estoque.',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
                encerra_apos: true,
            },
        ],
    },
    {
        id: 2,
        nome: 'Recuperação de orçamento',
        ativo: true,
        atualizadoEm: '2026-11-11T14:05:00-03:00',
        execucoes_count: 31,
        agendamentos_count: 2,
        regras: [{ gatilho: 'mensagem_recebida', ativo: true }],
        horario: { ativo: false, inicio: '', fim: '', foraHorario: 'nao_iniciar' },
        etapas: [
            {
                id: 21,
                ordem: 1,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Oi, {{nome}}! Passando para saber se ficou alguma dúvida sobre o orçamento que enviamos.',
                pausa_segundos: 3,
                indicador_digitacao_ativo: true,
                indicador_digitacao_segundos: 3,
            },
            {
                id: 22,
                ordem: 2,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Se quiser, reservo as peças por 24 horas sem compromisso.',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
            {
                id: 23,
                ordem: 3,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Qualquer coisa é só responder por aqui.',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
                encerra_apos: true,
            },
        ],
    },
    {
        id: 3,
        nome: 'Pós-venda 7 dias',
        ativo: false,
        atualizadoEm: '2026-11-08T09:40:00-03:00',
        execucoes_count: 12,
        agendamentos_count: 1,
        regras: [{ gatilho: 'novo_contato', ativo: false }],
        horario: { ativo: false, inicio: '', fim: '', foraHorario: 'nao_iniciar' },
        etapas: [
            {
                id: 31,
                ordem: 1,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Oi, {{nome}}! Como foi a experiência com a sua compra?',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
            {
                id: 32,
                ordem: 2,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Se puder, conta em uma frase o que achou. Isso ajuda muito a equipe.',
                pausa_segundos: 4,
                indicador_digitacao_ativo: true,
                indicador_digitacao_segundos: 4,
            },
        ],
    },
    {
        id: 4,
        nome: 'Rascunho — pós-venda (não publicado)',
        ativo: false,
        atualizadoEm: '2026-11-13T08:10:00-03:00',
        execucoes_count: 0,
        agendamentos_count: 0,
        regras: [{ gatilho: 'mensagem_recebida', ativo: false }],
        horario: { ativo: false, inicio: '', fim: '', foraHorario: 'nao_iniciar' },
        etapas: [
            {
                id: 41,
                ordem: 1,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: 'Oi, {{nome}}! Como foi a sua experiência com a compra?',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
        ],
    },
];

export const agendamentos = [
    {
        id: 101,
        fluxo: 'Recuperação de orçamento',
        contato: 'Ana Beatriz Almeida',
        executarEm: '2026-11-13T14:30:00-03:00',
        estado: 'pendente',
    },
    {
        id: 102,
        fluxo: 'Pós-venda 7 dias',
        contato: 'Helena Duarte',
        executarEm: '2026-11-14T09:00:00-03:00',
        estado: 'pendente',
    },
    {
        id: 103,
        fluxo: 'Boas-vindas — Coleção Primavera',
        contato: 'Marcos Vinícius',
        executarEm: '2026-11-13T10:00:00-03:00',
        estado: 'executado',
    },
    {
        id: 104,
        fluxo: 'Recuperação de orçamento',
        contato: 'Fernanda Lopes',
        executarEm: '2026-11-12T16:00:00-03:00',
        estado: 'executado',
    },
    {
        id: 105,
        fluxo: 'Pós-venda 7 dias',
        contato: 'Igor Salles',
        executarEm: '2026-11-12T11:00:00-03:00',
        estado: 'cancelado',
    },
    {
        id: 106,
        fluxo: 'Boas-vindas — Coleção Primavera',
        contato: 'Juliana Reis',
        executarEm: '2026-11-11T15:00:00-03:00',
        estado: 'falhou',
    },
];

export const logs = [
    {
        id: 900,
        evento: 'mensagem_enviada',
        descricao: 'Demonstração: etapa 6 do fluxo Boas-vindas respondida no Messenger.',
        criadoEm: '2026-11-13T09:36:00-03:00',
        tipo: 'envio',
    },
    {
        id: 899,
        evento: 'mensagem_recebida',
        descricao: 'Demonstração: mensagem recebida do contato DEMO-PSID-1042.',
        criadoEm: '2026-11-13T09:35:00-03:00',
        tipo: 'entrada',
    },
    {
        id: 898,
        evento: 'midia_enviada',
        descricao: 'Demonstração: imagem demo-vestido-terracota.jpg enviada pela etapa 4.',
        criadoEm: '2026-11-13T09:22:00-03:00',
        tipo: 'envio',
    },
    {
        id: 897,
        evento: 'fluxo_iniciado',
        descricao: 'Demonstração: fluxo Boas-vindas — Coleção Primavera iniciado para Ana Beatriz Almeida.',
        criadoEm: '2026-11-13T09:12:00-03:00',
        tipo: 'fluxo',
    },
    {
        id: 896,
        evento: 'origem_registrada',
        descricao: 'Demonstração: origem de anúncio DEMO-AD-7781 associada ao contato.',
        criadoEm: '2026-11-13T09:12:00-03:00',
        tipo: 'origem',
    },
    {
        id: 895,
        evento: 'agendamento_executado',
        descricao: 'Demonstração: agendamento 103 iniciado no horário previsto.',
        criadoEm: '2026-11-13T10:00:00-03:00',
        tipo: 'agendamento',
    },
    {
        id: 894,
        evento: 'fluxo_concluido',
        descricao: 'Demonstração: execução do fluxo Recuperação de orçamento concluída.',
        criadoEm: '2026-11-12T18:41:00-03:00',
        tipo: 'fluxo',
    },
    {
        id: 893,
        evento: 'agendamento_nao_executado',
        descricao: 'Demonstração: horário do agendamento fora da janela permitida do fluxo.',
        criadoEm: '2026-11-12T15:00:00-03:00',
        tipo: 'falha',
    },
    {
        id: 892,
        evento: 'mensagem_recebida',
        descricao: 'Demonstração: mensagem recebida do contato DEMO-PSID-1045.',
        criadoEm: '2026-11-12T17:18:00-03:00',
        tipo: 'entrada',
    },
    {
        id: 891,
        evento: 'condicao_horario_avaliada',
        descricao: 'Demonstração: bloco de condição escolheu o caminho da tarde.',
        criadoEm: '2026-11-12T13:22:00-03:00',
        tipo: 'fluxo',
    },
    {
        id: 890,
        evento: 'fluxo_iniciado',
        descricao: 'Demonstração: fluxo Pós-venda 7 dias iniciado para Helena Duarte.',
        criadoEm: '2026-11-12T15:30:00-03:00',
        tipo: 'fluxo',
    },
    {
        id: 889,
        evento: 'agendamento_falhou',
        descricao: 'Demonstração: falha simulada de envio durante o agendamento 106.',
        criadoEm: '2026-11-11T15:02:00-03:00',
        tipo: 'falha',
    },
];

export const convites = [
    {
        id: 301,
        email: 'convite.aurora@exemplo.invalid',
        estado: 'pendente',
        emitidoEm: '2026-11-12T10:00:00-03:00',
        expiraEm: '2026-11-19T10:00:00-03:00',
    },
    {
        id: 302,
        email: 'convite.horizonte@exemplo.invalid',
        estado: 'resgatado',
        emitidoEm: '2026-11-05T09:30:00-03:00',
        expiraEm: '2026-11-12T09:30:00-03:00',
        resgatadoEm: '2026-11-06T14:12:00-03:00',
    },
    {
        id: 303,
        email: 'convite.bandeira@exemplo.invalid',
        estado: 'revogado',
        emitidoEm: '2026-11-03T16:45:00-03:00',
        expiraEm: '2026-11-10T16:45:00-03:00',
        revogadoEm: '2026-11-04T08:20:00-03:00',
    },
    {
        id: 304,
        email: 'convite.ipe@exemplo.invalid',
        estado: 'expirado',
        emitidoEm: '2026-10-20T11:00:00-03:00',
        expiraEm: '2026-10-27T11:00:00-03:00',
    },
];

export const contasAdministrativas = [
    {
        id: 401,
        nome: 'Ateliê Aurora — demonstração',
        email: 'aurora@exemplo.invalid',
        estado: 'ativa',
        criadaEm: '2026-10-02T10:15:00-03:00',
        ultimoAcesso: '2026-11-13T09:40:00-03:00',
        responsavel: 'Administração FlowChat (demo)',
    },
    {
        id: 402,
        nome: 'Loja Horizonte — demonstração',
        email: 'horizonte@exemplo.invalid',
        estado: 'ativa',
        criadaEm: '2026-10-09T14:00:00-03:00',
        ultimoAcesso: '2026-11-12T18:22:00-03:00',
        responsavel: null,
    },
    {
        id: 403,
        nome: 'Café Bandeira — demonstração',
        email: 'bandeira@exemplo.invalid',
        estado: 'suspensa',
        criadaEm: '2026-10-14T09:20:00-03:00',
        ultimoAcesso: '2026-11-04T11:05:00-03:00',
        motivoSuspensao: 'Demonstração: pendência de validação do piloto.',
        responsavel: 'Administração FlowChat (demo)',
    },
    {
        id: 404,
        nome: 'Studio Ipê — demonstração',
        email: 'ipe@exemplo.invalid',
        estado: 'ativa',
        criadaEm: '2026-10-21T16:30:00-03:00',
        ultimoAcesso: null,
        responsavel: null,
    },
    {
        id: 405,
        nome: 'Mercado Vila — demonstração',
        email: 'vila@exemplo.invalid',
        estado: 'suspensa',
        criadaEm: '2026-10-27T08:45:00-03:00',
        ultimoAcesso: '2026-11-09T07:58:00-03:00',
        motivoSuspensao: 'Demonstração: solicitação do responsável durante o piloto.',
        responsavel: 'Administração FlowChat (demo)',
    },
    {
        id: 406,
        nome: 'Oficina Norte — demonstração',
        email: 'norte@exemplo.invalid',
        estado: 'ativa',
        criadaEm: '2026-11-02T13:10:00-03:00',
        ultimoAcesso: '2026-11-11T10:17:00-03:00',
        responsavel: null,
    },
];

export const administradores = [
    { id: 501, nome: 'Administração FlowChat (demo)', email: 'admin@exemplo.invalid' },
    { id: 502, nome: 'Suporte de demonstração', email: 'suporte@exemplo.invalid' },
];

export const paginasMessenger = [
    { id: 'DEMO-PAGINA-0001', nome: 'Ateliê Aurora (demonstração)', seguidores: '12,4 mil' },
    { id: 'DEMO-PAGINA-0002', nome: 'Loja Horizonte (demonstração)', seguidores: '4,8 mil' },
    { id: 'DEMO-PAGINA-0003', nome: 'Café Bandeira (demonstração)', seguidores: '1,2 mil' },
];

export const sessoes = [
    {
        id: 'DEMO-SESSAO-1',
        dispositivo: 'Chrome no Windows — este dispositivo',
        ip: '192.0.2.10',
        ultimoAcesso: '13/11/2026, 09:41',
        atual: true,
    },
    {
        id: 'DEMO-SESSAO-2',
        dispositivo: 'Safari no iPhone',
        ip: '203.0.113.24',
        ultimoAcesso: '12/11/2026, 18:12',
        atual: false,
    },
];

/**
 * Amostra de fusos IANA usada apenas no preview. A tela real usa a lista
 * completa de app/Support/FusosHorarios.php; a V2 mantém a mesma nomenclatura
 * e mostra a limitação no mapa.
 */
export const fusosAmostra = [
    { valor: 'America/Sao_Paulo', rotulo: 'Brasil — São Paulo' },
    { valor: 'America/Bahia', rotulo: 'Brasil — Bahia' },
    { valor: 'America/Manaus', rotulo: 'Brasil — Manaus' },
    { valor: 'America/Recife', rotulo: 'Brasil — Recife' },
    { valor: 'America/Rio_Branco', rotulo: 'Brasil — Rio Branco' },
    { valor: 'America/Fortaleza', rotulo: 'Brasil — Fortaleza' },
    { valor: 'America/Belem', rotulo: 'Brasil — Belém' },
    { valor: 'America/Cuiaba', rotulo: 'Brasil — Cuiabá' },
    { valor: 'America/Campo_Grande', rotulo: 'Brasil — Campo Grande' },
    { valor: 'America/Porto_Velho', rotulo: 'Brasil — Porto Velho' },
    { valor: 'America/Boa_Vista', rotulo: 'Brasil — Boa Vista' },
    { valor: 'America/Noronha', rotulo: 'Brasil — Fernando de Noronha' },
    { valor: 'Europe/Lisbon', rotulo: 'Portugal — Lisboa' },
    { valor: 'Europe/Madrid', rotulo: 'Espanha — Madri' },
    { valor: 'Europe/London', rotulo: 'Reino Unido — Londres' },
    { valor: 'America/New_York', rotulo: 'Estados Unidos — Nova York' },
    { valor: 'America/Los_Angeles', rotulo: 'Estados Unidos — Los Angeles' },
    { valor: 'UTC', rotulo: 'UTC' },
];

export const estadosInterface = [
    {
        chave: 'vazio',
        titulo: 'Estado vazio',
        descricao: 'Listas usam linguagem direta e uma próxima ação, sem decoração.',
    },
    {
        chave: 'carregando',
        titulo: 'Carregamento',
        descricao: 'Esqueletos preservam as dimensões para evitar salto de layout.',
    },
    {
        chave: 'erro',
        titulo: 'Erro',
        descricao: 'A mensagem explica o que falhou e o que fazer em seguida.',
    },
    {
        chave: 'confirmacao',
        titulo: 'Confirmação',
        descricao: 'Ações destrutivas abrem um diálogo com o efeito explícito.',
    },
    {
        chave: 'feedback',
        titulo: 'Feedback',
        descricao: 'A ação simulada confirma no aviso global, sem gravar nada.',
    },
];

/* ---------- Formatadores compartilhados ---------- */

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
});

const formatadorDataHoraCurta = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const formatadorDiaLongo = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
});

export function formatarData(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? '—' : formatadorData.format(data);
}

export function formatarDataHora(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? '—' : formatadorDataHora.format(data);
}

export function formatarHora(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? '—' : formatadorHora.format(data);
}

export function formatarDataHoraCurta(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? '—' : formatadorDataHoraCurta.format(data);
}

export function formatarDiaLongo(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? '—' : formatadorDiaLongo.format(data);
}

export function chaveDoDia(valor) {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return 'sem-data';
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

export function nomeDoContato(contato) {
    return contato?.nome?.trim() || contato?.psid || 'Contato sem identificação';
}

export function iniciaisDoContato(contato) {
    const nome = nomeDoContato(contato);
    const partes = nome.trim().split(/\s+/);

    if (partes.length > 1) {
        return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }

    return nome.slice(0, 2).toUpperCase();
}

export function resumoMensagem(mensagem) {
    if (!mensagem) {
        return 'Nenhuma mensagem registrada';
    }

    if (mensagem.tipo_conteudo && mensagem.tipo_conteudo !== 'texto') {
        return `${rotulosTipoConteudo[mensagem.tipo_conteudo] ?? 'Mídia'}: ${mensagem.anexo_nome_original ?? 'anexo'}`;
    }

    return mensagem.texto || 'Nenhuma mensagem registrada';
}

export function origemEhAnuncio(origem) {
    return Boolean(origem) && (origem.categoria === 'anuncio' || Boolean(origem.ad_id));
}

export function rotuloOrigem(origem) {
    if (!origem) {
        return null;
    }

    if (origemEhAnuncio(origem)) {
        return 'Anúncio';
    }

    if (String(origem.source ?? '').toUpperCase() === 'SHORTLINK') {
        return 'Link';
    }

    if (String(origem.source ?? '').toUpperCase() === 'POSTBACK') {
        return 'Postback';
    }

    return 'Origem';
}

export function descreverEtapa(etapa) {
    if (etapa.tipo === 'condicao_horario') {
        return 'Condição por horário';
    }

    if (etapa.tipo_conteudo && etapa.tipo_conteudo !== 'texto') {
        return `Mídia · ${rotulosTipoConteudo[etapa.tipo_conteudo] ?? etapa.tipo_conteudo}`;
    }

    return etapa.texto?.trim() || 'Mensagem sem texto';
}

export function totalMensagensDoContato(contato) {
    return (contato?.mensagens ?? []).length;
}
