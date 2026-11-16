<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\Contato;
use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use App\Support\ArmazenamentoMidia;
use App\Support\MidiaEtapa;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

class EnviarEtapaFluxo implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     *
     * O segundo parâmetro evita reenviar o indicador quando o mesmo job é
     * reagendado apenas para aguardar a duração configurada na etapa.
     */
    public function __construct(public int $execucaoId, public bool $indicadorDigitacaoTratado = false) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $execucao = ExecucaoFluxo::find($this->execucaoId);
        if (! $execucao || $execucao->concluida_em !== null) {
            return;
        }

        $conta = $execucao->account;
        $fluxo = $execucao->fluxo;
        $contato = $execucao->contato;
        if ($conta === null || $fluxo === null || $contato === null
            || (int) $fluxo->account_id !== (int) $conta->id
            || (int) $contato->account_id !== (int) $conta->id) {
            return;
        }

        if ($conta->estaSuspensa()) {
            $this->encerrarExecucaoComFalha(
                $execucao,
                $conta->id,
                (int) $execucao->etapa_atual,
                'conta suspensa',
            );

            return;
        }

        $etapa = EtapaFluxo::where('fluxo_id', $execucao->fluxo_id)
            ->where('ordem', $execucao->etapa_atual)
            ->first();

        // Sem próxima etapa: fluxo concluído
        if (! $etapa) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create(['account_id' => $conta->id, 'evento' => 'fluxo_concluido', 'descricao' => "Execução {$execucao->id} concluída"]);

            return;
        }

        if ($etapa->ehCondicaoHorario()) {
            $this->executarCondicaoHorario($execucao, $etapa, $conta);

            return;
        }

        $token = $conta->messengerIntegration?->page_access_token;

        // Revalida antes de qualquer envio: a suspensão pode ter sido
        // confirmada enquanto este job aguardava na fila.
        if ($conta->fresh()?->estaSuspensa() === true) {
            $this->encerrarExecucaoComFalha(
                $execucao,
                $conta->id,
                (int) $etapa->ordem,
                'conta suspensa',
            );

            return;
        }

        // O indicador é enviado numa execução e a mensagem numa execução
        // reagendada: nenhum worker fica bloqueado aguardando a duração.
        if (! $this->indicadorDigitacaoTratado && $etapa->indicador_digitacao_ativo) {
            $segundos = max(1, min(20, (int) ($etapa->indicador_digitacao_segundos ?? 2)));

            if ($this->enviarAcaoDigitacao($token, $contato->psid, 'typing_on', $conta->id)) {
                EnviarEtapaFluxo::dispatch($execucao->id, true)->delay($segundos);

                return;
            }

            // Falha no indicador não trava a execução: a mensagem segue agora.
        }

        // Encerra explicitamente o indicador antes da mensagem; a falha desta
        // ação não impede o envio, pois a mensagem também o dispensa.
        if ($this->indicadorDigitacaoTratado) {
            $this->enviarAcaoDigitacao($token, $contato->psid, 'typing_off', $conta->id);
        }

        $tipoConteudo = (string) ($etapa->tipo_conteudo ?? MidiaEtapa::TipoTexto);

        if (MidiaEtapa::tipoValido($tipoConteudo)) {
            $dadosMensagem = $this->enviarEtapaMidia($etapa, $conta, $contato, $token, $tipoConteudo);

            if ($dadosMensagem === null) {
                $this->encerrarExecucaoComFalha(
                    $execucao,
                    $conta->id,
                    $etapa->ordem,
                    'falha ao enviar mídia',
                );

                return;
            }
        } else {
            $textoPersonalizado = str_replace(
                ['{{nome}}', '{{psid}}', '{{id_contato}}'],
                [$contato->nome ?: '', (string) $contato->psid, (string) $contato->psid],
                $etapa->texto
            );

            if (! $this->enviarMensagem($token, $contato->psid, $textoPersonalizado, $conta->id)) {
                $this->encerrarExecucaoComFalha(
                    $execucao,
                    $conta->id,
                    $etapa->ordem,
                    'falha ao enviar texto',
                );

                return;
            }

            $dadosMensagem = ['texto' => $textoPersonalizado];
        }

        Mensagem::create([
            'contato_id' => $execucao->contato_id,
            'direcao' => 'enviada',
            ...$dadosMensagem,
        ]);
        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'mensagem_enviada',
            'descricao' => MidiaEtapa::tipoValido($tipoConteudo)
                ? "Etapa {$etapa->ordem} (mídia {$tipoConteudo}) enviada ao PSID {$contato->psid}"
                : "Etapa {$etapa->ordem} enviada ao PSID {$contato->psid}",
        ]);

        $execucao->increment('etapa_atual');

        // Ramos independentes podem terminar aqui sem seguir para a etapa
        // seguinte da lista. O comportamento padrão continua sequencial.
        if ($etapa->encerra_apos) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create(['account_id' => $conta->id, 'evento' => 'fluxo_concluido', 'descricao' => "Execução {$execucao->id} concluída após a etapa {$etapa->ordem}"]);

            return;
        }

        // Sem próxima etapa não há pausa a aguardar: conclui imediatamente
        $temProximaEtapa = EtapaFluxo::where('fluxo_id', $execucao->fluxo_id)
            ->where('ordem', $execucao->etapa_atual)
            ->exists();

        if (! $temProximaEtapa) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create(['account_id' => $conta->id, 'evento' => 'fluxo_concluido', 'descricao' => "Execução {$execucao->id} concluída"]);

            return;
        }

        // Aguarda a pausa da etapa antes de enviar a próxima
        EnviarEtapaFluxo::dispatch($execucao->id)->delay($etapa->pausa_segundos);
    }

    /**
     * Registra a falha terminal do job e libera o contato para novos fluxos.
     */
    public function failed(?Throwable $exception): void
    {
        $execucao = ExecucaoFluxo::find($this->execucaoId);
        if ($execucao === null || $execucao->concluida_em !== null) {
            return;
        }

        $contaId = (int) $execucao->account_id;
        $tipoFalha = $exception === null
            ? 'tentativas de envio esgotadas'
            : 'job falhou após as tentativas configuradas ('.class_basename($exception).')';

        $this->encerrarExecucaoComFalha(
            $execucao,
            $contaId,
            (int) $execucao->etapa_atual,
            $tipoFalha,
        );
    }

    private function encerrarExecucaoComFalha(
        ExecucaoFluxo $execucao,
        int $accountId,
        int $ordemEtapa,
        string $motivo,
    ): void {
        $atualizada = ExecucaoFluxo::query()
            ->whereKey($execucao->id)
            ->whereNull('concluida_em')
            ->update(['concluida_em' => now()]);

        if ($atualizada === 0) {
            return;
        }

        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'fluxo_falhou',
            'descricao' => "Execução {$execucao->id} encerrada na etapa {$ordemEtapa}: {$motivo}",
        ]);
    }

    /**
     * Envia uma etapa de mídia usando a Attachment Upload API e um
     * attachment_id reutilizável, privado da Página conectada.
     *
     * @return array{texto: null, tipo_conteudo: string, anexo_caminho: string, anexo_nome_original: string|null, anexo_mime: string|null, anexo_tamanho_bytes: int|null}|null
     */
    private function enviarEtapaMidia(
        EtapaFluxo $etapa,
        Account $conta,
        Contato $contato,
        ?string $token,
        string $tipoConteudo,
    ): ?array {
        if (! $token) {
            $this->registrarErroMidia($conta->id, 'Token da Página do Messenger não configurado');

            return null;
        }

        $caminho = (string) $etapa->anexo_caminho;
        if ($caminho === '' || ! Storage::disk(ArmazenamentoMidia::DISCO)->exists($caminho)) {
            $this->registrarErroMidia($conta->id, "Arquivo da etapa {$etapa->ordem} não está disponível no armazenamento privado");

            return null;
        }

        $integracao = $conta->messengerIntegration;
        if ($integracao === null) {
            $this->registrarErroMidia($conta->id, 'Integração do Messenger não configurada para enviar mídia');

            return null;
        }

        $attachmentId = $this->obterAttachmentId($etapa, $integracao->page_id, $token, $tipoConteudo, $conta->id);
        if ($attachmentId === null) {
            return null;
        }

        $resposta = $this->enviarAnexoPorId($token, $contato->psid, $tipoConteudo, $attachmentId);

        // Um attachment_id pode ter sido revogado ou expirado antes do prazo
        // documentado. Nesse caso, reenvia o arquivo original uma única vez.
        if (! $resposta->successful() && $this->erroAnexoInvalido($resposta)) {
            $this->limparAttachmentId($etapa);
            $attachmentId = $this->obterAttachmentId($etapa, $integracao->page_id, $token, $tipoConteudo, $conta->id);

            if ($attachmentId === null) {
                return null;
            }

            $resposta = $this->enviarAnexoPorId($token, $contato->psid, $tipoConteudo, $attachmentId);
        }

        if (! $resposta->successful()) {
            $this->registrarErroMidia(
                $conta->id,
                'Graph API rejeitou o envio de mídia: '.$this->resumoErroMeta($resposta),
            );

            return null;
        }

        return [
            'texto' => null,
            'tipo_conteudo' => $tipoConteudo,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => $etapa->anexo_nome_original,
            'anexo_mime' => $etapa->anexo_mime,
            'anexo_tamanho_bytes' => $etapa->anexo_tamanho_bytes,
        ];
    }

    /**
     * Reutiliza o attachment_id apenas quando ele pertence à Página atual e
     * ainda tem margem antes da expiração documentada de 90 dias.
     */
    private function obterAttachmentId(
        EtapaFluxo $etapa,
        string $pageId,
        string $token,
        string $tipoConteudo,
        int $accountId,
    ): ?string {
        $attachmentId = $etapa->anexo_attachment_id;
        $expiraEm = $etapa->anexo_attachment_expira_em;

        if (is_string($attachmentId)
            && $attachmentId !== ''
            && $etapa->anexo_attachment_page_id === $pageId
            && $expiraEm !== null
            && $expiraEm->isAfter(now()->addDay())) {
            return $attachmentId;
        }

        $caminho = (string) $etapa->anexo_caminho;
        $stream = Storage::disk(ArmazenamentoMidia::DISCO)->readStream($caminho);

        if (! is_resource($stream)) {
            $this->registrarErroMidia($accountId, "Não foi possível ler o arquivo da etapa {$etapa->ordem}");

            return null;
        }

        try {
            $extensao = pathinfo($caminho, PATHINFO_EXTENSION);
            $nomeEnvio = 'midia'.($extensao !== '' ? '.'.$extensao : '');
            $message = json_encode([
                'attachment' => [
                    'type' => MidiaEtapa::tipoMeta($tipoConteudo),
                    'payload' => ['is_reusable' => true],
                ],
            ]);

            $resposta = Http::withToken($token)
                ->connectTimeout(5)
                ->timeout(120)
                ->attach(
                    'filedata',
                    $stream,
                    $nomeEnvio,
                    ['Content-Type' => $etapa->anexo_mime ?: 'application/octet-stream'],
                )
                ->post(config('services.messenger.api_url').'/'.$pageId.'/message_attachments', [
                    'message' => $message,
                ]);
        } catch (Throwable) {
            $this->registrarErroMidia($accountId, 'Falha de comunicação ao enviar o arquivo à Meta');

            return null;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! $resposta->successful()) {
            $this->registrarErroMidia(
                $accountId,
                'Graph API rejeitou o upload do arquivo: '.$this->resumoErroMeta($resposta),
            );

            return null;
        }

        $attachmentId = $resposta->json('attachment_id');
        if (! is_string($attachmentId) || $attachmentId === '') {
            $this->registrarErroMidia($accountId, 'A Meta não devolveu um attachment_id válido para o arquivo');

            return null;
        }

        $etapa->update([
            'anexo_attachment_id' => $attachmentId,
            'anexo_attachment_page_id' => $pageId,
            'anexo_attachment_expira_em' => now()->addDays(90),
        ]);

        return $attachmentId;
    }

    private function enviarAnexoPorId(string $token, string $psid, string $tipoConteudo, string $attachmentId): Response
    {
        return Http::withToken($token)
            ->connectTimeout(5)
            ->timeout(30)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'message' => [
                    'attachment' => [
                        'type' => MidiaEtapa::tipoMeta($tipoConteudo),
                        'payload' => ['attachment_id' => $attachmentId],
                    ],
                ],
            ]);
    }

    private function limparAttachmentId(EtapaFluxo $etapa): void
    {
        $etapa->update([
            'anexo_attachment_id' => null,
            'anexo_attachment_page_id' => null,
            'anexo_attachment_expira_em' => null,
        ]);
    }

    private function erroAnexoInvalido(Response $resposta): bool
    {
        $subcodigo = (int) ($resposta->json('error.error_subcode') ?? 0);

        return in_array($subcodigo, [2018074, 2018008], true);
    }

    private function resumoErroMeta(Response $resposta): string
    {
        $erro = $resposta->json('error');

        if (! is_array($erro)) {
            return 'HTTP '.$resposta->status();
        }

        $partes = [];

        foreach (['code' => 'code', 'error_subcode' => 'subcode', 'message' => 'message'] as $chave => $rotulo) {
            $valor = $erro[$chave] ?? null;

            if (is_scalar($valor) && (string) $valor !== '') {
                $partes[] = $rotulo.'='.mb_substr((string) $valor, 0, 200);
            }
        }

        return 'HTTP '.$resposta->status().($partes === [] ? '' : ' — '.implode(' | ', $partes));
    }

    private function registrarErroMidia(int $accountId, string $descricao): void
    {
        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_envio_midia',
            'descricao' => $descricao,
        ]);
    }

    /**
     * Avalia o bloco no fuso confirmado da conta e segue o primeiro intervalo
     * válido; sem correspondência, segue a saída NÃO ou encerra a execução.
     */
    private function executarCondicaoHorario(ExecucaoFluxo $execucao, EtapaFluxo $etapa, Account $conta): void
    {
        $fuso = $conta->fusoHorarioConfirmado();

        // Sem fuso confirmado não há como escolher o caminho com segurança.
        if ($fuso === null) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'condicao_horario_sem_fuso',
                'descricao' => "Execução {$execucao->id} encerrada: a conta não tem fuso horário confirmado para avaliar a condição da etapa {$etapa->ordem}",
            ]);

            return;
        }

        $agora = now($fuso);
        $minutosAgora = $agora->hour * 60 + $agora->minute;
        $destino = null;
        $condicaoEscolhida = null;

        foreach ($etapa->condicoes()->get() as $condicao) {
            $inicio = self::minutosDaHora($condicao->inicio);
            $fim = self::minutosDaHora($condicao->fim);

            // Limites inclusivos com precisão de minuto.
            if ($minutosAgora >= $inicio && $minutosAgora <= $fim) {
                $destino = (int) $condicao->destino_ordem;
                $condicaoEscolhida = $condicao;
                break;
            }
        }

        if ($destino === null && $etapa->destino_nao_ordem !== null) {
            $destino = (int) $etapa->destino_nao_ordem;
        }

        if ($destino === null) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'fluxo_concluido',
                'descricao' => "Execução {$execucao->id} concluída: nenhuma condição da etapa {$etapa->ordem} correspondia e não há saída NÃO",
            ]);

            return;
        }

        // Destinos devem apontar para etapas posteriores; isto também impede
        // que dados antigos ou manipulados criem um ciclo infinito de saltos.
        if ($destino <= (int) $etapa->ordem) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'condicao_horario_destino_invalido',
                'descricao' => "Execução {$execucao->id} encerrada: a condição da etapa {$etapa->ordem} aponta para a etapa {$destino}",
            ]);

            return;
        }

        $execucao->update(['etapa_atual' => $destino]);

        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'condicao_horario_avaliada',
            'descricao' => "Execução {$execucao->id}: etapa {$etapa->ordem} às {$agora->format('H:i')} ({$fuso}) seguiu para a etapa {$destino}"
                .($condicaoEscolhida === null ? ' pela saída NÃO' : ''),
        ]);

        EnviarEtapaFluxo::dispatch($execucao->id);
    }

    /**
     * Converte uma hora "HH:MM" ou "HH:MM:SS" em minutos do dia.
     */
    private static function minutosDaHora(?string $hora): int
    {
        $partes = explode(':', (string) $hora);

        return ((int) ($partes[0] ?? 0)) * 60 + ((int) ($partes[1] ?? 0));
    }

    /**
     * Envia uma ação de remetente (`typing_on` ou `typing_off`) à Send API.
     */
    private function enviarAcaoDigitacao(?string $token, string $psid, string $acao, int $accountId): bool
    {
        if (! $token) {
            LogSistema::create([
                'account_id' => $accountId,
                'evento' => 'erro_indicador_digitacao',
                'descricao' => 'Token da Página do Messenger não configurado para enviar '.$acao,
            ]);

            return false;
        }

        $resposta = Http::withToken($token)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'sender_action' => $acao,
            ]);

        if ($resposta->successful()) {
            return true;
        }

        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_indicador_digitacao',
            'descricao' => 'Graph API rejeitou '.$acao.': '.$this->resumoErroMeta($resposta),
        ]);

        return false;
    }

    /**
     * Envia mensagem pela Facebook Messenger Platform API.
     */
    private function enviarMensagem(?string $token, string $psid, string $texto, int $accountId): bool
    {
        if (! $token) {
            LogSistema::create(['account_id' => $accountId, 'evento' => 'erro_envio', 'descricao' => 'Token da Página do Messenger não configurado']);

            return false;
        }

        $resposta = Http::withToken($token)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'message' => ['text' => $texto],
            ]);

        if ($resposta->successful()) {
            return true;
        }

        // Registra a rejeição da Graph API para permitir diagnóstico
        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_envio',
            'descricao' => 'Graph API rejeitou o envio: '.$this->resumoErroMeta($resposta),
        ]);

        return false;
    }
}
