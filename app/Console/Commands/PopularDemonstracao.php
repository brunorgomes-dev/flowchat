<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Agendamento;
use App\Models\CondicaoHorarioEtapa;
use App\Models\Contato;
use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use App\Models\OrigemContato;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('flowchat:demo-popular {--confirm} {--senha-file=}')]
#[Description('Cria dados demonstrativos idempotentes na conta fictícia do banco local')]
class PopularDemonstracao extends Command
{
    private const CONTA_NOME = 'Demonstração FlowChat — dados fictícios';

    private const EMAIL = 'demo@flowchat.invalid';

    private const SENHA_MINIMA = 12;

    public function handle(): int
    {
        if (! $this->option('confirm')) {
            $this->error('Recusado: use --confirm para criar dados demonstrativos.');

            return self::FAILURE;
        }

        $host = config('database.connections.mysql.host');
        $banco = config('database.connections.mysql.database');

        if (config('app.env') !== 'local' || $host !== 'db' || $banco !== 'flowchat') {
            $this->error('Recusado: este comando só pode rodar com APP_ENV=local, DB_HOST=db e DB_DATABASE=flowchat (banco local confirmado).');

            return self::FAILURE;
        }

        $utilizador = User::query()->whereRaw('LOWER(email) = ?', [self::EMAIL])->first();
        $conta = $utilizador?->account;

        if ($utilizador !== null && $conta === null) {
            $this->error('Recusado: o usuário demonstrativo existe sem conta associada; revise manualmente.');

            return self::FAILURE;
        }

        if ($conta !== null && $conta->name !== self::CONTA_NOME) {
            $this->error('Recusado: já existe um usuário com o email demonstrativo em outra conta; nenhum dado foi alterado.');

            return self::FAILURE;
        }

        if ($conta === null) {
            $conta = Account::query()->firstOrCreate(
                ['name' => self::CONTA_NOME],
                ['timezone' => 'America/Sao_Paulo', 'timezone_confirmado' => true],
            );
        }

        if ($utilizador === null && $conta->user !== null) {
            $this->error('Recusado: a conta demonstrativa já possui outro usuário; nenhum dado foi alterado.');

            return self::FAILURE;
        }

        $senha = null;
        if ($utilizador === null) {
            $senha = $this->lerSenha();
            if ($senha === null) {
                return self::FAILURE;
            }
        }

        DB::transaction(function () use ($conta, $utilizador, $senha): void {
            if ($utilizador === null) {
                User::create([
                    'account_id' => $conta->id,
                    'name' => 'Usuário Demonstração',
                    'email' => self::EMAIL,
                    'password' => $senha,
                    'last_login_at' => now()->subHours(4),
                ]);
            }

            $contatos = $this->criarContatos($conta);
            $anexos = $this->criarAnexos($conta);
            $this->criarMensagens($contatos, $anexos);
            $this->criarOrigens($conta, $contatos);
            $this->criarLogs($conta, $contatos);

            $fluxos = $this->criarFluxos($conta);
            $this->criarExecucoes($conta, $contatos, $fluxos);
            $this->criarAgendamentos($conta, $contatos, $fluxos);
        });

        $this->info('Dados demonstrativos criados/atualizados de forma idempotente.');
        $this->line('Conta: '.self::CONTA_NOME);
        $this->line('Usuário demonstrativo: '.self::EMAIL.' (senha definida apenas na primeira criação).');
        $this->line('Nenhum convite, integração Messenger, token ou job foi criado.');

        return self::SUCCESS;
    }

    private function lerSenha(): ?string
    {
        $arquivo = $this->option('senha-file');

        if (is_string($arquivo) && $arquivo !== '') {
            $conteudo = @file_get_contents($arquivo);
            if ($conteudo === false) {
                $this->error('Não foi possível ler o arquivo de senha demonstrativa.');

                return null;
            }

            $senha = trim($conteudo);
        } else {
            $senha = (string) $this->secret('Senha do usuário demonstrativo (mínimo 12 caracteres, com letras e números)');
            $confirmacao = (string) $this->secret('Confirme a senha demonstrativa');

            if ($senha !== $confirmacao) {
                $this->error('A confirmação da senha não coincide.');

                return null;
            }
        }

        $validador = Validator::make(
            ['password' => $senha],
            ['password' => ['required', 'string', Password::min(self::SENHA_MINIMA)->letters()->numbers()]],
            [
                'password.required' => 'Informe a senha demonstrativa.',
                'password.min' => 'A senha demonstrativa deve ter pelo menos 12 caracteres.',
                'password.letters' => 'A senha demonstrativa deve conter letras.',
                'password.numbers' => 'A senha demonstrativa deve conter números.',
            ],
        );

        if ($validador->fails()) {
            foreach ($validador->errors()->all() as $erro) {
                $this->error($erro);
            }

            return null;
        }

        return $senha;
    }

    /**
     * @return array<string, Contato>
     */
    private function criarContatos(Account $conta): array
    {
        $definicoes = [
            'ana' => ['psid' => 'DEMO-ANA-01', 'nome' => 'Ana Beatriz'],
            'carlos' => ['psid' => 'DEMO-CARLOS-02', 'nome' => 'Carlos Eduardo'],
            'fernanda' => ['psid' => 'DEMO-FERNANDA-03', 'nome' => 'Fernanda Lima'],
            'joao' => ['psid' => 'DEMO-JOAO-04', 'nome' => 'João Pedro'],
            'mariana' => ['psid' => 'DEMO-MARIANA-05', 'nome' => 'Mariana Souza'],
            'rafael' => ['psid' => 'DEMO-RAFAEL-06', 'nome' => 'Rafael Almeida'],
            'juliana' => ['psid' => 'DEMO-JULIANA-07', 'nome' => 'Juliana Castro'],
            'bruno' => ['psid' => 'DEMO-BRUNO-08', 'nome' => 'Bruno Martins'],
        ];

        $contatos = [];
        foreach ($definicoes as $chave => $dados) {
            $contatos[$chave] = Contato::query()->firstOrCreate(
                ['account_id' => $conta->id, 'psid' => $dados['psid']],
                ['nome' => $dados['nome']],
            );
        }

        return $contatos;
    }

    /**
     * @return array{imagem: string, arquivo: string}
     */
    private function criarAnexos(Account $conta): array
    {
        $diretorio = 'flowchat/etapas/'.$conta->id;
        $imagem = $diretorio.'/demo-orcamento.png';
        $arquivo = $diretorio.'/demo-briefing.txt';

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', true);
        $texto = "Briefing fictício para demonstração local.\nNenhum dado real ou chamada externa.\n";

        if ($png === false || ! Storage::disk('local')->put($imagem, $png)) {
            throw new \RuntimeException('Não foi possível gravar a imagem demonstrativa.');
        }

        if (! Storage::disk('local')->put($arquivo, $texto)) {
            throw new \RuntimeException('Não foi possível gravar o arquivo demonstrativo.');
        }

        return ['imagem' => $imagem, 'arquivo' => $arquivo];
    }

    /**
     * @param  array<string, Contato>  $contatos
     * @param  array{imagem: string, arquivo: string}  $anexos
     */
    private function criarMensagens(array $contatos, array $anexos): void
    {
        $mensagens = [
            'ana' => [
                ['recebida', 'Oi! Vi o anúncio de vocês e queria entender melhor os planos.', 180],
                ['enviada', 'Olá, Ana! Que bom falar com você. Posso explicar como funciona o atendimento.', 176],
                ['recebida', 'Pode me contar os valores e o que está incluído?', 165],
                ['enviada', 'Claro! Temos uma opção de demonstração e outra para equipes. Vou te enviar um resumo.', 160],
            ],
            'carlos' => [
                ['recebida', 'Bom dia! Vocês atendem no fim de semana?', 145],
                ['enviada', 'Bom dia, Carlos! No momento o atendimento automático funciona todos os dias.', 140],
                ['recebida', 'Perfeito. E consigo falar com uma pessoa se precisar?', 135],
            ],
            'fernanda' => [
                ['recebida', 'Olá, gostaria de receber um orçamento para a minha loja.', 120],
                ['enviada', 'Olá, Fernanda! Vou registrar seu pedido e enviar uma prévia do orçamento.', 116],
                ['recebida', 'Pode ser por aqui mesmo, obrigada.', 110],
            ],
            'joao' => [
                ['recebida', 'Quero agendar uma conversa para amanhã pela manhã.', 95],
                ['enviada', 'João, anotei sua preferência. Vou confirmar os horários disponíveis.', 90],
                ['recebida', 'Obrigado! Fico no aguardo.', 85],
            ],
            'mariana' => [
                ['recebida', 'Estou com uma dúvida sobre a integração com o Messenger.', 70],
                ['enviada', 'Mariana, posso te ajudar. A conexão é feita pela área de Configurações.', 66],
                ['recebida', 'Entendi. Vou conferir e volto se precisar.', 60],
            ],
            'rafael' => [
                ['recebida', 'Cheguei pelo link do site de vocês.', 45],
                ['enviada', 'Que bom ter você aqui, Rafael! Como posso ajudar?', 40],
                ['recebida', 'Queria conhecer melhor o fluxo de atendimento.', 35],
            ],
            'juliana' => [
                ['recebida', 'Oi! Tudo bem? Recebi o retorno ontem e queria continuar a conversa.', 25],
                ['enviada', 'Olá, Juliana! Tudo bem. Estou à disposição para continuar de onde paramos.', 20],
                ['recebida', 'Perfeito, obrigada!', 15],
            ],
            'bruno' => [
                ['recebida', 'Segue o briefing que comentamos, por favor.', 10],
                ['enviada', 'Recebi, Bruno! Vou encaminhar para a equipe responsável.', 8],
            ],
        ];

        foreach ($mensagens as $chave => $lista) {
            foreach ($lista as $indice => [$direcao, $texto, $minutosAtras]) {
                $mensagem = Mensagem::query()->firstOrCreate(
                    [
                        'contato_id' => $contatos[$chave]->id,
                        'direcao' => $direcao,
                        'texto' => $texto,
                        'tipo_conteudo' => 'texto',
                    ],
                    [],
                );

                $this->definirData($mensagem, now()->subMinutes($minutosAtras));
            }
        }

        $this->criarMensagemComAnexo(
            $contatos['fernanda'],
            'enviada',
            'imagem',
            $anexos['imagem'],
            'orcamento-demonstracao.png',
            'image/png',
            68,
            now()->subDays(1)->subMinutes(20),
        );

        $this->criarMensagemComAnexo(
            $contatos['bruno'],
            'recebida',
            'arquivo',
            $anexos['arquivo'],
            'briefing-demonstracao.txt',
            'text/plain',
            strlen("Briefing fictício para demonstração local.\nNenhum dado real ou chamada externa.\n"),
            now()->subMinutes(9),
        );
    }

    private function criarMensagemComAnexo(
        Contato $contato,
        string $direcao,
        string $tipo,
        string $caminho,
        string $nome,
        string $mime,
        int $tamanho,
        Carbon $data,
    ): void {
        $mensagem = Mensagem::query()->firstOrCreate(
            [
                'contato_id' => $contato->id,
                'direcao' => $direcao,
                'tipo_conteudo' => $tipo,
                'anexo_caminho' => $caminho,
            ],
            [
                'texto' => null,
                'anexo_nome_original' => $nome,
                'anexo_mime' => $mime,
                'anexo_tamanho_bytes' => $tamanho,
            ],
        );

        $this->definirData($mensagem, $data);
    }

    /**
     * @param  array<string, Contato>  $contatos
     */
    private function criarOrigens(Account $conta, array $contatos): void
    {
        $origens = [
            'ana' => ['ad_id' => 'DEMO-AD-1001', 'ad_title' => 'Anúncio fictício — Planos de atendimento', 'tema' => 'planos'],
            'fernanda' => ['ad_id' => 'DEMO-AD-1002', 'ad_title' => 'Anúncio fictício — Orçamento para lojas', 'tema' => 'orçamento'],
            'joao' => ['ad_id' => 'DEMO-AD-1003', 'ad_title' => 'Anúncio fictício — Agende uma conversa', 'tema' => 'agendamento'],
            'rafael' => ['ad_id' => 'DEMO-AD-1004', 'ad_title' => 'Anúncio fictício — Conheça o FlowChat', 'tema' => 'apresentação'],
        ];

        foreach ($origens as $chave => $dados) {
            $origem = OrigemContato::query()->firstOrCreate(
                [
                    'account_id' => $conta->id,
                    'contato_id' => $contatos[$chave]->id,
                    'evento' => 'referral',
                    'ad_id' => $dados['ad_id'],
                ],
                [
                    'categoria' => 'anuncio',
                    'source' => 'ADS',
                    'type' => 'AD',
                    'referencia' => 'DEMO-REF-'.$dados['ad_id'],
                    'ad_title' => $dados['ad_title'],
                    'mensagem_inicial' => 'Olá! Vim pelo anúncio e gostaria de saber mais.',
                    'dados_brutos' => [
                        'source' => 'ADS',
                        'type' => 'AD',
                        'ad_id' => $dados['ad_id'],
                    ],
                ],
            );

            $this->definirData($origem, now()->subDays(2)->subMinutes(10));
        }
    }

    /**
     * @param  array<string, Contato>  $contatos
     */
    private function criarLogs(Account $conta, array $contatos): void
    {
        $eventos = [
            'mensagem_recebida' => 'Demonstração: mensagem recebida de %s',
            'mensagem_enviada' => 'Demonstração: resposta enviada para %s',
            'origem_contato_registrada' => 'Demonstração: origem de anúncio registrada para %s',
            'fluxo_iniciado' => 'Demonstração: fluxo de boas-vindas iniciado para %s',
            'fluxo_concluido' => 'Demonstração: fluxo de boas-vindas concluído para %s',
            'agendamento_executado' => 'Demonstração: agendamento executado para %s',
        ];

        foreach (array_values($contatos) as $indice => $contato) {
            $nome = $contato->nome;
            foreach (array_slice($eventos, 0, 3) as $evento => $modelo) {
                $log = LogSistema::query()->firstOrCreate([
                    'account_id' => $conta->id,
                    'evento' => $evento,
                    'descricao' => sprintf($modelo, $nome),
                ]);

                $this->definirData($log, now()->subMinutes(300 - ($indice * 7)));
            }
        }

        $log = LogSistema::query()->firstOrCreate([
            'account_id' => $conta->id,
            'evento' => 'fluxo_iniciado',
            'descricao' => 'Demonstração: fluxo de horário de atendimento iniciado para Ana Beatriz',
        ]);
        $this->definirData($log, now()->subMinutes(170));

        $log = LogSistema::query()->firstOrCreate([
            'account_id' => $conta->id,
            'evento' => 'fluxo_concluido',
            'descricao' => 'Demonstração: fluxo de horário de atendimento concluído para Ana Beatriz',
        ]);
        $this->definirData($log, now()->subMinutes(150));

        $log = LogSistema::query()->firstOrCreate([
            'account_id' => $conta->id,
            'evento' => 'agendamento_executado',
            'descricao' => 'Demonstração: agendamento de retorno executado para Carlos Eduardo',
        ]);
        $this->definirData($log, now()->subDays(1)->subMinutes(30));
    }

    /**
     * @return array{boas_vindas: Fluxo, horario: Fluxo}
     */
    private function criarFluxos(Account $conta): array
    {
        $boasVindas = Fluxo::query()->firstOrCreate(
            ['account_id' => $conta->id, 'nome' => 'Fluxo Demonstração — Boas-vindas'],
            ['ativo' => true],
        );

        $etapasBoasVindas = [
            ['ordem' => 1, 'texto' => 'Olá, {{nome}}! Que bom ter você por aqui. Como posso ajudar hoje?'],
            ['ordem' => 2, 'texto' => 'Posso explicar os planos, o funcionamento do atendimento ou agendar uma conversa.'],
            ['ordem' => 3, 'texto' => 'Se preferir, escreva sua dúvida e uma pessoa da equipe continuará o atendimento.'],
        ];

        foreach ($etapasBoasVindas as $dados) {
            EtapaFluxo::query()->firstOrCreate(
                ['fluxo_id' => $boasVindas->id, 'ordem' => $dados['ordem']],
                [
                    'tipo' => 'mensagem',
                    'texto' => $dados['texto'],
                    'tipo_conteudo' => 'texto',
                    'pausa_segundos' => $dados['ordem'] === 1 ? 2 : 3,
                    'indicador_digitacao_ativo' => true,
                    'indicador_digitacao_segundos' => 4,
                    'encerra_apos' => $dados['ordem'] === 3,
                ],
            );
        }

        $horario = Fluxo::query()->firstOrCreate(
            ['account_id' => $conta->id, 'nome' => 'Fluxo Demonstração — Horário de atendimento'],
            ['ativo' => true],
        );

        EtapaFluxo::query()->firstOrCreate(
            ['fluxo_id' => $horario->id, 'ordem' => 1],
            ['tipo' => 'mensagem', 'texto' => 'Olá! Vou verificar o horário de atendimento para te orientar.', 'tipo_conteudo' => 'texto', 'pausa_segundos' => 1],
        );

        $condicao = EtapaFluxo::query()->firstOrCreate(
            ['fluxo_id' => $horario->id, 'ordem' => 2],
            ['tipo' => 'condicao_horario', 'texto' => '', 'tipo_conteudo' => 'texto', 'pausa_segundos' => 0, 'destino_nao_ordem' => 4],
        );

        $intervalos = [
            ['ordem' => 1, 'inicio' => '08:00', 'fim' => '12:00', 'destino_ordem' => 3],
            ['ordem' => 2, 'inicio' => '13:00', 'fim' => '18:00', 'destino_ordem' => 3],
            ['ordem' => 3, 'inicio' => '18:01', 'fim' => '23:59', 'destino_ordem' => 4],
        ];

        foreach ($intervalos as $intervalo) {
            CondicaoHorarioEtapa::query()->firstOrCreate(
                ['etapa_fluxo_id' => $condicao->id, 'ordem' => $intervalo['ordem']],
                $intervalo,
            );
        }

        EtapaFluxo::query()->firstOrCreate(
            ['fluxo_id' => $horario->id, 'ordem' => 3],
            ['tipo' => 'mensagem', 'texto' => 'Estamos dentro do horário de atendimento. Uma pessoa da equipe pode continuar a conversa.', 'tipo_conteudo' => 'texto', 'pausa_segundos' => 2, 'encerra_apos' => true],
        );

        EtapaFluxo::query()->firstOrCreate(
            ['fluxo_id' => $horario->id, 'ordem' => 4],
            ['tipo' => 'mensagem', 'texto' => 'No momento estamos fora do horário de atendimento. Deixe sua mensagem e retornaremos no próximo período.', 'tipo_conteudo' => 'texto', 'pausa_segundos' => 2, 'encerra_apos' => true],
        );

        Fluxo::query()->firstOrCreate(
            ['account_id' => $conta->id, 'nome' => 'Fluxo Demonstração — Pós-atendimento'],
            ['ativo' => false],
        );

        return ['boas_vindas' => $boasVindas, 'horario' => $horario];
    }

    /**
     * @param  array<string, Contato>  $contatos
     * @param  array{boas_vindas: Fluxo, horario: Fluxo}  $fluxos
     */
    private function criarExecucoes(Account $conta, array $contatos, array $fluxos): void
    {
        $execucao = ExecucaoFluxo::query()->firstOrCreate(
            [
                'account_id' => $conta->id,
                'contato_id' => $contatos['ana']->id,
                'fluxo_id' => $fluxos['boas_vindas']->id,
                'etapa_atual' => 3,
            ],
            ['concluida_em' => now()->subHours(2)],
        );
        $this->definirData($execucao, now()->subHours(2));

        $execucao = ExecucaoFluxo::query()->firstOrCreate(
            [
                'account_id' => $conta->id,
                'contato_id' => $contatos['carlos']->id,
                'fluxo_id' => $fluxos['horario']->id,
                'etapa_atual' => 1,
            ],
            ['concluida_em' => null],
        );
        $this->definirData($execucao, now()->subMinutes(140));
    }

    /**
     * @param  array<string, Contato>  $contatos
     * @param  array{boas_vindas: Fluxo, horario: Fluxo}  $fluxos
     */
    private function criarAgendamentos(Account $conta, array $contatos, array $fluxos): void
    {
        $definicoes = [
            ['contato' => 'ana', 'fluxo' => 'boas_vindas', 'data' => Carbon::create(2026, 11, 10, 9, 0, 0, 'America/Sao_Paulo'), 'estado' => 'executado'],
            ['contato' => 'carlos', 'fluxo' => 'horario', 'data' => Carbon::create(2026, 11, 11, 14, 0, 0, 'America/Sao_Paulo'), 'estado' => 'cancelado'],
            ['contato' => 'joao', 'fluxo' => 'boas_vindas', 'data' => Carbon::create(2026, 11, 12, 16, 0, 0, 'America/Sao_Paulo'), 'estado' => 'falhou'],
            ['contato' => 'juliana', 'fluxo' => 'horario', 'data' => Carbon::create(2026, 12, 1, 10, 0, 0, 'America/Sao_Paulo'), 'estado' => 'pendente'],
        ];

        foreach ($definicoes as $definicao) {
            $agendamento = Agendamento::query()->firstOrCreate(
                [
                    'account_id' => $conta->id,
                    'fluxo_id' => $fluxos[$definicao['fluxo']]->id,
                    'contato_id' => $contatos[$definicao['contato']]->id,
                    'executar_em' => $definicao['data'],
                ],
                ['estado' => $definicao['estado']],
            );

            $this->definirData($agendamento, now()->subDays(3));
        }
    }

    private function definirData(Model $model, Carbon $data): void
    {
        if (! $model->wasRecentlyCreated) {
            return;
        }

        $model->forceFill([
            'created_at' => $data,
            'updated_at' => $data,
        ])->saveQuietly();
    }
}
