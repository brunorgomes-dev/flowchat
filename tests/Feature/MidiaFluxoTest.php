<?php

namespace Tests\Feature;

use App\Jobs\EnviarEtapaFluxo;
use App\Jobs\ProcessarMensagemEntrante;
use App\Models\Account;
use App\Models\Contato;
use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\User;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class MidiaFluxoTest extends TestCase
{
    public function test_cria_fluxo_com_imagem_e_persiste_arquivo_privado(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();

        $resposta = $this->actingAs($utilizador)->post('/fluxos', [
            'nome' => 'Fluxo com imagem',
            'ativo' => true,
            'etapas' => [
                $this->dadosEtapa([
                    'tipo_conteudo' => 'imagem',
                    'texto' => '',
                    'anexo' => UploadedFile::fake()->create('capa.png', 10, 'image/png'),
                ]),
            ],
            'regras' => [['gatilho' => 'mensagem_recebida', 'ativo' => true]],
        ]);

        $resposta->assertRedirect();

        $fluxo = Fluxo::query()->firstOrFail();
        $etapa = $fluxo->etapas()->firstOrFail();

        $this->assertSame('imagem', $etapa->tipo_conteudo);
        $this->assertSame('capa.png', $etapa->anexo_nome_original);
        $this->assertSame('image/png', $etapa->anexo_mime);
        $this->assertSame(10 * 1024, $etapa->anexo_tamanho_bytes);
        $this->assertNotNull($etapa->anexo_caminho);
        Storage::disk('local')->assertExists($etapa->anexo_caminho);

        $this->actingAs($utilizador)
            ->get("/fluxos/{$fluxo->id}/editar")
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->where('fluxo.etapas.0.tipo_conteudo', 'imagem')
                ->where('fluxo.etapas.0.anexo_nome_original', 'capa.png')
                ->where('fluxo.etapas.0.anexo_caminho', $etapa->anexo_caminho));
    }

    public function test_rejeita_imagem_acima_do_limite(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();

        $resposta = $this->actingAs($utilizador)
            ->from('/fluxos/criar')
            ->post('/fluxos', [
                'nome' => 'Imagem grande',
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'imagem',
                        'texto' => '',
                        'anexo' => UploadedFile::fake()->create('grande.png', 9 * 1024, 'image/png'),
                    ]),
                ],
            ]);

        $resposta->assertSessionHasErrors('etapas.0.anexo');
        $this->assertDatabaseCount('fluxos', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_rejeita_texto_junto_com_midia(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();

        $resposta = $this->actingAs($utilizador)
            ->from('/fluxos/criar')
            ->post('/fluxos', [
                'nome' => 'Texto e imagem',
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'imagem',
                        'texto' => 'Legenda não suportada',
                        'anexo' => UploadedFile::fake()->create('capa.png', 10, 'image/png'),
                    ]),
                ],
            ]);

        $resposta->assertSessionHasErrors('etapas.0.texto');
        $this->assertDatabaseCount('fluxos', 0);
    }

    public function test_fluxo_de_texto_legado_continua_enviando_texto(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_texto',
            'page_access_token' => 'token-texto',
        ]);
        $conta->contatos()->create(['psid' => 'psid-texto', 'nome' => 'Contato Texto']);
        $fluxo = $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'texto',
            'texto' => 'Mensagem de texto',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'https://graph.facebook.com/v23.0/me/messages' => Http::response(['message_id' => 'm_texto']),
        ]);

        (new ProcessarMensagemEntrante($conta->id, 'psid-texto', 'oi'))->handle();

        Http::assertSent(fn (ClientRequest $requisicao) => $requisicao->url() === 'https://graph.facebook.com/v23.0/me/messages'
            && ($requisicao['message']['text'] ?? null) === 'Mensagem de texto');
        Http::assertNotSent(fn (ClientRequest $requisicao) => str_contains($requisicao->url(), 'message_attachments'));

        $this->assertDatabaseHas('mensagens', [
            'contato_id' => Contato::query()->where('psid', 'psid-texto')->firstOrFail()->id,
            'direcao' => 'enviada',
            'texto' => 'Mensagem de texto',
            'tipo_conteudo' => 'texto',
        ]);
        $this->assertModelExists($fluxo);
    }

    public function test_envia_midia_com_attachment_upload_e_reutiliza_attachment_id(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => '123',
            'page_access_token' => 'token-midia',
        ]);
        $conta->contatos()->create(['psid' => 'psid-midia', 'nome' => 'Contato Mídia']);

        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        $corpoUpload = null;
        Http::fake(function (ClientRequest $requisicao) use (&$corpoUpload) {
            if (str_contains($requisicao->url(), '/message_attachments')) {
                // O job fecha o stream do arquivo ao terminar; captura o corpo
                // durante a requisição simulada.
                $corpoUpload = $requisicao->body();

                return Http::response(['attachment_id' => 'att-1']);
            }

            return Http::response(['message_id' => 'm_midia']);
        });

        (new ProcessarMensagemEntrante($conta->id, 'psid-midia', 'primeira'))->handle();

        $etapa = EtapaFluxo::query()->firstOrFail();
        $this->assertSame('att-1', $etapa->anexo_attachment_id);
        $this->assertSame('123', $etapa->anexo_attachment_page_id);
        $this->assertNotNull($etapa->anexo_attachment_expira_em);

        $this->assertNotNull($corpoUpload);
        $this->assertStringContainsString('name="message"', $corpoUpload);
        $this->assertStringContainsString('"type":"image"', $corpoUpload);
        $this->assertStringContainsString('"is_reusable":true', $corpoUpload);
        Http::assertSent(fn (ClientRequest $requisicao) => str_contains($requisicao->url(), '/message_attachments')
            && $requisicao->hasFile('filedata'));
        Http::assertSent(fn (ClientRequest $requisicao) => $requisicao->url() === 'https://graph.facebook.com/v23.0/me/messages'
            && ($requisicao['message']['attachment']['payload']['attachment_id'] ?? null) === 'att-1');

        $this->assertDatabaseHas('mensagens', [
            'direcao' => 'enviada',
            'tipo_conteudo' => 'imagem',
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
        ]);

        (new ProcessarMensagemEntrante($conta->id, 'psid-midia', 'segunda'))->handle();

        $this->assertCount(1, Http::recorded(fn (ClientRequest $requisicao) => str_contains($requisicao->url(), '/message_attachments')));
        Http::assertSentCount(3);
    }

    /**
     * @return array<string, array{string, string, string, string}>
     */
    public static function midiasSuportadas(): array
    {
        return [
            'imagem' => ['imagem', 'capa.png', 'image/png', 'image'],
            'audio' => ['audio', 'voz.mp3', 'audio/mpeg', 'audio'],
            'video' => ['video', 'demo.mp4', 'video/mp4', 'video'],
            'documento' => ['arquivo', 'contrato.pdf', 'application/pdf', 'file'],
        ];
    }

    #[DataProvider('midiasSuportadas')]
    public function test_envia_cada_tipo_de_midia_com_payload_e_persistencia_corretos(
        string $tipo,
        string $nomeArquivo,
        string $mime,
        string $tipoMeta,
    ): void {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_'.$tipo,
            'page_access_token' => 'token-'.$tipo,
        ]);
        $conta->contatos()->create(['psid' => 'psid-'.$tipo, 'nome' => 'Contato '.$tipo]);
        $extensao = pathinfo($nomeArquivo, PATHINFO_EXTENSION);
        $caminho = $this->criarArquivoPrivado($conta, $extensao);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => $tipo,
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => $nomeArquivo,
            'anexo_mime' => $mime,
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        $corpoUpload = null;
        Http::fake(function (ClientRequest $requisicao) use (&$corpoUpload, $tipo) {
            if (str_contains($requisicao->url(), '/message_attachments')) {
                $corpoUpload = $requisicao->body();

                return Http::response(['attachment_id' => 'att-'.$tipo]);
            }

            return Http::response(['message_id' => 'm-'.$tipo]);
        });

        (new ProcessarMensagemEntrante($conta->id, 'psid-'.$tipo, 'oi'))->handle();

        $etapa = EtapaFluxo::query()->firstOrFail();
        $this->assertSame($tipo, $etapa->tipo_conteudo);
        $this->assertSame('att-'.$tipo, $etapa->anexo_attachment_id);
        $this->assertSame('pagina_'.$tipo, $etapa->anexo_attachment_page_id);

        $this->assertNotNull($corpoUpload);
        $this->assertStringContainsString('"type":"'.$tipoMeta.'"', $corpoUpload);
        $this->assertStringContainsString('"is_reusable":true', $corpoUpload);

        Http::assertSent(fn (ClientRequest $requisicao) => $requisicao->url() === 'https://graph.facebook.com/v23.0/me/messages'
            && ($requisicao['message']['attachment']['type'] ?? null) === $tipoMeta
            && ($requisicao['message']['attachment']['payload']['attachment_id'] ?? null) === 'att-'.$tipo);

        $this->assertDatabaseHas('mensagens', [
            'direcao' => 'enviada',
            'texto' => null,
            'tipo_conteudo' => $tipo,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => $nomeArquivo,
            'anexo_mime' => $mime,
        ]);
        $this->assertNotNull(ExecucaoFluxo::query()->firstOrFail()->concluida_em);
    }

    /**
     * @return array<string, array{string, string, string}>
     */
    public static function arquivosInvalidos(): array
    {
        return [
            'extensao incompativel' => ['imagem', 'capa.pdf', 'application/pdf'],
            'mime incompativel' => ['imagem', 'capa.png', 'application/pdf'],
            'audio com mime de imagem' => ['audio', 'voz.wav', 'image/png'],
        ];
    }

    #[DataProvider('arquivosInvalidos')]
    public function test_rejeita_extensao_ou_mime_incompativel_com_o_tipo(
        string $tipo,
        string $nomeArquivo,
        string $mime,
    ): void {
        Storage::fake('local');
        $utilizador = User::factory()->create();

        $resposta = $this->actingAs($utilizador)
            ->from('/fluxos/criar')
            ->post('/fluxos', [
                'nome' => 'Mídia inválida',
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => $tipo,
                        'texto' => '',
                        'anexo' => UploadedFile::fake()->create($nomeArquivo, 10, $mime),
                    ]),
                ],
            ]);

        $resposta->assertSessionHasErrors('etapas.0.anexo');
        $this->assertDatabaseCount('fluxos', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_rejeita_audio_acima_do_limite_de_upload(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();

        $resposta = $this->actingAs($utilizador)
            ->from('/fluxos/criar')
            ->post('/fluxos', [
                'nome' => 'Áudio grande',
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'audio',
                        'texto' => '',
                        'anexo' => UploadedFile::fake()->create('voz.mp3', 26 * 1024, 'audio/mpeg'),
                    ]),
                ],
            ]);

        $resposta->assertSessionHasErrors('etapas.0.anexo');
        $this->assertDatabaseCount('fluxos', 0);
    }

    public function test_falha_no_upload_nao_registra_mensagem_enviada(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_falha',
            'page_access_token' => 'token-secreto-nao-logar',
        ]);
        $conta->contatos()->create(['psid' => 'psid-falha', 'nome' => 'Contato Falha']);
        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'arquivo',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'documento.pdf',
            'anexo_mime' => 'application/pdf',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'https://graph.facebook.com/v23.0/pagina_falha/message_attachments' => Http::response([
                'error' => [
                    'code' => 100,
                    'error_subcode' => 2018008,
                    'message' => 'Falha ao processar o arquivo',
                ],
            ], 400),
        ]);

        (new ProcessarMensagemEntrante($conta->id, 'psid-falha', 'oi'))->handle();

        $this->assertDatabaseMissing('mensagens', [
            'direcao' => 'enviada',
            'tipo_conteudo' => 'arquivo',
        ]);
        Http::assertNotSent(fn (ClientRequest $requisicao) => $requisicao->url() === 'https://graph.facebook.com/v23.0/me/messages');

        $log = LogSistema::query()->where('evento', 'erro_envio_midia')->firstOrFail();
        $this->assertStringContainsString('Falha ao processar o arquivo', $log->descricao);
        $this->assertStringNotContainsString('token-secreto-nao-logar', $log->descricao);

        $execucao = ExecucaoFluxo::query()->firstOrFail();
        $this->assertNotNull($execucao->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'fluxo_falhou']);

        // Uma nova tentativa do job não reenvia a mídia após o encerramento.
        (new EnviarEtapaFluxo($execucao->id))->handle();
        Http::assertSentCount(1);
    }

    public function test_falha_no_envio_da_midia_encerra_execucao_sem_mensagem(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_envio',
            'page_access_token' => 'token-envio',
        ]);
        $conta->contatos()->create(['psid' => 'psid-envio', 'nome' => 'Contato Envio']);
        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'video',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'demo.mp4',
            'anexo_mime' => 'video/mp4',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'https://graph.facebook.com/v23.0/pagina_envio/message_attachments' => Http::response(['attachment_id' => 'att-envio']),
            'https://graph.facebook.com/v23.0/me/messages' => Http::response([
                'error' => ['code' => 100, 'message' => 'Envio rejeitado'],
            ], 400),
        ]);

        (new ProcessarMensagemEntrante($conta->id, 'psid-envio', 'oi'))->handle();

        $this->assertDatabaseMissing('mensagens', ['direcao' => 'enviada', 'tipo_conteudo' => 'video']);
        $this->assertNotNull(ExecucaoFluxo::query()->firstOrFail()->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'erro_envio_midia']);
        $this->assertDatabaseHas('logs', ['evento' => 'fluxo_falhou']);
    }

    public function test_attachment_id_invalido_reenvia_upload_uma_unica_vez(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_retry',
            'page_access_token' => 'token-retry',
        ]);
        $conta->contatos()->create(['psid' => 'psid-retry', 'nome' => 'Contato Retry']);
        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        $uploads = 0;
        $envios = 0;
        Http::fake(function (ClientRequest $requisicao) use (&$uploads, &$envios) {
            if (str_contains($requisicao->url(), '/message_attachments')) {
                $uploads++;

                return Http::response(['attachment_id' => 'att-'.$uploads]);
            }

            $envios++;
            if ($envios === 1) {
                return Http::response([
                    'error' => ['code' => 100, 'error_subcode' => 2018008, 'message' => 'Anexo inválido'],
                ], 400);
            }

            return Http::response(['message_id' => 'm-retry']);
        });

        (new ProcessarMensagemEntrante($conta->id, 'psid-retry', 'oi'))->handle();

        $this->assertSame(2, $uploads);
        $this->assertSame(2, $envios);
        $this->assertSame('att-2', EtapaFluxo::query()->firstOrFail()->anexo_attachment_id);
        $this->assertDatabaseHas('mensagens', ['direcao' => 'enviada', 'tipo_conteudo' => 'imagem']);
        $this->assertNotNull(ExecucaoFluxo::query()->firstOrFail()->concluida_em);
    }

    public function test_attachment_id_de_outra_pagina_forca_novo_upload(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_nova',
            'page_access_token' => 'token-novo',
        ]);
        $conta->contatos()->create(['psid' => 'psid-pagina', 'nome' => 'Contato Página']);
        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
            'anexo_attachment_id' => 'att-antigo',
            'anexo_attachment_page_id' => 'pagina_antiga',
            'anexo_attachment_expira_em' => now()->addDays(30),
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'https://graph.facebook.com/v23.0/pagina_nova/message_attachments' => Http::response(['attachment_id' => 'att-novo']),
            'https://graph.facebook.com/v23.0/me/messages' => Http::response(['message_id' => 'm-pagina']),
        ]);

        (new ProcessarMensagemEntrante($conta->id, 'psid-pagina', 'oi'))->handle();

        $etapa = EtapaFluxo::query()->firstOrFail();
        $this->assertSame('att-novo', $etapa->anexo_attachment_id);
        $this->assertSame('pagina_nova', $etapa->anexo_attachment_page_id);
        Http::assertSent(fn (ClientRequest $requisicao) => str_contains($requisicao->url(), '/message_attachments'));
        Http::assertSent(fn (ClientRequest $requisicao) => $requisicao->url() === 'https://graph.facebook.com/v23.0/me/messages'
            && ($requisicao['message']['attachment']['payload']['attachment_id'] ?? null) === 'att-novo');
    }

    public function test_midia_sem_token_encerra_execucao_sem_chamada_http(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->contatos()->create(['psid' => 'psid-sem-token', 'nome' => 'Contato Sem Token']);
        $caminho = $this->criarArquivoPrivado($conta);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        Http::fake();

        (new ProcessarMensagemEntrante($conta->id, 'psid-sem-token', 'oi'))->handle();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('mensagens', ['direcao' => 'enviada']);
        $this->assertNotNull(ExecucaoFluxo::query()->firstOrFail()->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'erro_envio_midia']);
    }

    public function test_midia_com_arquivo_ausente_encerra_execucao_sem_chamada_http(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create([
            'page_id' => 'pagina_ausente',
            'page_access_token' => 'token-ausente',
        ]);
        $conta->contatos()->create(['psid' => 'psid-ausente', 'nome' => 'Contato Ausente']);
        $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'arquivo',
            'texto' => null,
            'anexo_caminho' => 'flowchat/etapas/'.$conta->id.'/nao-existe.pdf',
            'anexo_nome_original' => 'ausente.pdf',
            'anexo_mime' => 'application/pdf',
            'anexo_tamanho_bytes' => 10,
        ]);

        Http::preventStrayRequests();
        Http::fake();

        (new ProcessarMensagemEntrante($conta->id, 'psid-ausente', 'oi'))->handle();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('mensagens', ['direcao' => 'enviada']);
        $this->assertNotNull(ExecucaoFluxo::query()->firstOrFail()->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'erro_envio_midia']);
    }

    public function test_failed_do_job_encerra_execucao(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $contato = Contato::factory()->create(['account_id' => $conta->id]);
        $fluxo = $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'texto',
            'texto' => 'Mensagem',
        ]);
        $execucao = $conta->execucoes()->create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        (new EnviarEtapaFluxo($execucao->id))->failed(new RuntimeException('falha simulada'));

        $this->assertNotNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseHas('logs', [
            'evento' => 'fluxo_falhou',
            'descricao' => "Execução {$execucao->id} encerrada na etapa 1: job falhou após as tentativas configuradas (RuntimeException)",
        ]);
        $this->assertDatabaseMissing('mensagens', ['direcao' => 'enviada']);
    }

    public function test_conta_nao_acessa_anexo_de_outra_conta(): void
    {
        Storage::fake('local');
        $utilizadorA = User::factory()->create();
        $utilizadorB = User::factory()->create();
        $contaB = $utilizadorB->account;
        $caminho = $this->criarArquivoPrivado($contaB);
        $fluxoB = $this->criarFluxoComEtapa($contaB, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);
        $etapaB = $fluxoB->etapas()->firstOrFail();
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);
        $mensagemB = $contatoB->mensagens()->create([
            'direcao' => 'enviada',
            'texto' => null,
            'tipo_conteudo' => 'imagem',
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);

        $this->actingAs($utilizadorA)
            ->get("/fluxos/{$fluxoB->id}/etapas/{$etapaB->id}/anexo")
            ->assertNotFound();
        $this->actingAs($utilizadorA)
            ->get("/mensagens/{$mensagemB->id}/anexo")
            ->assertNotFound();

        $this->actingAs($utilizadorB)
            ->get("/fluxos/{$fluxoB->id}/etapas/{$etapaB->id}/anexo")
            ->assertOk();
        $this->actingAs($utilizadorB)
            ->get("/mensagens/{$mensagemB->id}/anexo")
            ->assertOk();
    }

    public function test_substituir_e_remover_midia_limpa_arquivos_orfaos(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $caminhoAntigo = $this->criarArquivoPrivado($conta);
        $fluxo = $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminhoAntigo,
            'anexo_nome_original' => 'antiga.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
            'anexo_attachment_id' => 'att-antigo',
            'anexo_attachment_page_id' => 'pagina_antiga',
            'anexo_attachment_expira_em' => now()->addDays(30),
        ]);

        $this->actingAs($utilizador)
            ->post("/fluxos/{$fluxo->id}", [
                '_method' => 'PUT',
                'nome' => $fluxo->nome,
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'imagem',
                        'texto' => '',
                        'anexo' => UploadedFile::fake()->create('nova.png', 10, 'image/png'),
                    ]),
                ],
            ])
            ->assertRedirect();

        $etapa = $fluxo->etapas()->firstOrFail();
        $caminhoNovo = $etapa->anexo_caminho;

        Storage::disk('local')->assertMissing($caminhoAntigo);
        Storage::disk('local')->assertExists($caminhoNovo);
        $this->assertNull($etapa->anexo_attachment_id);
        $this->assertNull($etapa->anexo_attachment_page_id);
        $this->assertNull($etapa->anexo_attachment_expira_em);

        $this->actingAs($utilizador)
            ->post("/fluxos/{$fluxo->id}", [
                '_method' => 'PUT',
                'nome' => $fluxo->nome,
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'texto',
                        'texto' => 'Agora é texto',
                        'remover_anexo' => true,
                    ]),
                ],
            ])
            ->assertRedirect();

        Storage::disk('local')->assertMissing($caminhoNovo);
        $this->assertDatabaseHas('etapas_fluxo', [
            'fluxo_id' => $fluxo->id,
            'tipo_conteudo' => 'texto',
            'anexo_caminho' => null,
        ]);
    }

    public function test_reordena_etapas_identificadas_preservando_arquivos_de_midia(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $caminhoImagem = $this->criarArquivoPrivado($conta);
        $caminhoAudio = $this->criarArquivoPrivado($conta, 'mp3');
        $caminhoVideo = $this->criarArquivoPrivado($conta, 'mp4');
        $caminhoArquivo = $this->criarArquivoPrivado($conta, 'pdf');
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo reordenado', 'ativo' => true]);
        $etapaTexto = $fluxo->etapas()->create([
            'ordem' => 1,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'texto',
            'texto' => 'Texto original',
            'pausa_segundos' => 0,
        ]);
        $etapaImagem = $fluxo->etapas()->create([
            'ordem' => 2,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'imagem',
            'texto' => '',
            'pausa_segundos' => 0,
            'anexo_caminho' => $caminhoImagem,
            'anexo_nome_original' => 'capa.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);
        $etapaAudio = $fluxo->etapas()->create([
            'ordem' => 3,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'audio',
            'texto' => '',
            'pausa_segundos' => 0,
            'anexo_caminho' => $caminhoAudio,
            'anexo_nome_original' => 'voz.mp3',
            'anexo_mime' => 'audio/mpeg',
            'anexo_tamanho_bytes' => 10,
        ]);
        $etapaVideo = $fluxo->etapas()->create([
            'ordem' => 4,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'video',
            'texto' => '',
            'pausa_segundos' => 0,
            'anexo_caminho' => $caminhoVideo,
            'anexo_nome_original' => 'demo.mp4',
            'anexo_mime' => 'video/mp4',
            'anexo_tamanho_bytes' => 10,
        ]);
        $etapaArquivo = $fluxo->etapas()->create([
            'ordem' => 5,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'arquivo',
            'texto' => '',
            'pausa_segundos' => 0,
            'anexo_caminho' => $caminhoArquivo,
            'anexo_nome_original' => 'manual.pdf',
            'anexo_mime' => 'application/pdf',
            'anexo_tamanho_bytes' => 10,
        ]);

        $this->actingAs($utilizador)
            ->put("/fluxos/{$fluxo->id}", [
                'nome' => $fluxo->nome,
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'id' => $etapaArquivo->id,
                        'tipo_conteudo' => 'arquivo',
                        'texto' => '',
                    ]),
                    $this->dadosEtapa([
                        'id' => $etapaAudio->id,
                        'tipo_conteudo' => 'audio',
                        'texto' => '',
                    ]),
                    $this->dadosEtapa([
                        'id' => $etapaTexto->id,
                        'texto' => 'Texto original',
                    ]),
                    $this->dadosEtapa([
                        'id' => $etapaVideo->id,
                        'tipo_conteudo' => 'video',
                        'texto' => '',
                    ]),
                    $this->dadosEtapa([
                        'id' => $etapaImagem->id,
                        'tipo_conteudo' => 'imagem',
                        'texto' => '',
                    ]),
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $etapasReordenadas = $fluxo->etapas()->orderBy('ordem')->get();

        $this->assertSame(
            [(int) $etapaArquivo->id, (int) $etapaAudio->id, (int) $etapaTexto->id, (int) $etapaVideo->id, (int) $etapaImagem->id],
            $etapasReordenadas->map(fn (EtapaFluxo $etapa): int => (int) $etapa->id)->all(),
        );
        $this->assertSame([1, 2, 3, 4, 5], $etapasReordenadas->map(fn (EtapaFluxo $etapa): int => (int) $etapa->ordem)->all());
        $this->assertSame($caminhoArquivo, $etapasReordenadas[0]->anexo_caminho);
        $this->assertSame($caminhoAudio, $etapasReordenadas[1]->anexo_caminho);
        $this->assertNull($etapasReordenadas[2]->anexo_caminho);
        $this->assertSame($caminhoVideo, $etapasReordenadas[3]->anexo_caminho);
        $this->assertSame($caminhoImagem, $etapasReordenadas[4]->anexo_caminho);
        Storage::disk('local')->assertExists($caminhoArquivo);
        Storage::disk('local')->assertExists($caminhoAudio);
        Storage::disk('local')->assertExists($caminhoVideo);
        Storage::disk('local')->assertExists($caminhoImagem);
    }

    public function test_substituir_midia_preserva_arquivo_referenciado_por_mensagem(): void
    {
        Storage::fake('local');
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $caminhoAntigo = $this->criarArquivoPrivado($conta);
        $fluxo = $this->criarFluxoComEtapa($conta, [
            'tipo_conteudo' => 'imagem',
            'texto' => null,
            'anexo_caminho' => $caminhoAntigo,
            'anexo_nome_original' => 'antiga.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);
        $contato = Contato::factory()->create(['account_id' => $conta->id]);
        $contato->mensagens()->create([
            'direcao' => 'enviada',
            'texto' => null,
            'tipo_conteudo' => 'imagem',
            'anexo_caminho' => $caminhoAntigo,
            'anexo_nome_original' => 'antiga.png',
            'anexo_mime' => 'image/png',
            'anexo_tamanho_bytes' => 10,
        ]);

        $this->actingAs($utilizador)
            ->post("/fluxos/{$fluxo->id}", [
                '_method' => 'PUT',
                'nome' => $fluxo->nome,
                'ativo' => true,
                'etapas' => [
                    $this->dadosEtapa([
                        'tipo_conteudo' => 'imagem',
                        'texto' => '',
                        'anexo' => UploadedFile::fake()->create('nova.png', 10, 'image/png'),
                    ]),
                ],
            ])
            ->assertRedirect();

        Storage::disk('local')->assertExists($caminhoAntigo);
        Storage::disk('local')->assertExists($fluxo->etapas()->firstOrFail()->anexo_caminho);
    }

    /**
     * @param  array<string, mixed>  $atributos
     * @return array<string, mixed>
     */
    private function dadosEtapa(array $atributos = []): array
    {
        return [
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'texto',
            'texto' => 'Olá',
            'pausa_segundos' => 0,
            'indicador_digitacao_ativo' => false,
            'indicador_digitacao_segundos' => 2,
            'condicoes' => [],
            'destino_nao_ordem' => null,
            'encerra_apos' => false,
            'remover_anexo' => false,
            ...$atributos,
        ];
    }

    /**
     * @param  array<string, mixed>  $atributos
     */
    private function criarFluxoComEtapa(Account $conta, array $atributos): Fluxo
    {
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo de mídia', 'ativo' => true]);
        $fluxo->etapas()->create([
            'ordem' => 1,
            'tipo' => 'mensagem',
            'pausa_segundos' => 0,
            ...$atributos,
            // O controller grava string vazia em etapas de mídia; a coluna
            // etapas_fluxo.texto é NOT NULL.
            'texto' => $atributos['texto'] ?? '',
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        return $fluxo;
    }

    private function criarArquivoPrivado(Account $conta, string $extensao = 'png'): string
    {
        $caminho = 'flowchat/etapas/'.$conta->id.'/'.Str::uuid()->toString().'.'.$extensao;
        Storage::disk('local')->put($caminho, 'conteudo');

        return $caminho;
    }
}
