<?php

namespace App\Jobs;

use App\Actions\Mensagens\AvaliarCondicaoDeHorario;
use App\Actions\Mensagens\EnviarIndicadorDigitacao;
use App\Actions\Mensagens\EnviarMidiaDaEtapa;
use App\Actions\Mensagens\EnviarTextoDaEtapa;
use App\Models\Contato;
use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use App\Support\MidiaEtapa;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class EnviarEtapaFluxo implements ShouldQueue
{
    use Queueable;

    /**
     * O envio ao Messenger não é idempotente: repetir o job pode entregar a
     * mesma mensagem duas vezes ao contato. Uma tentativa apenas.
     */
    public int $tries = 1;

    /**
     * Fica abaixo do `--timeout=90` do worker e do `retry_after=120` da fila
     * para o job nunca ser morto no meio de um envio (ver docker-compose.yml).
     */
    public int $timeout = 80;

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
        $condicao = app(AvaliarCondicaoDeHorario::class);
        $digitacao = app(EnviarIndicadorDigitacao::class);
        $midia = app(EnviarMidiaDaEtapa::class);
        $texto = app(EnviarTextoDaEtapa::class);

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

        // Não envia mensagens livres fora da janela aberta pela última
        // mensagem recebida ou pelo anúncio associado ao primeiro contato.
        if (Contato::janelaDeMensagemLivreDisponivel()) {
            $limiteJanela = $contato->limiteDaJanelaDeMensagemLivre();
            if ($limiteJanela === null || now()->greaterThanOrEqualTo($limiteJanela)) {
                $this->encerrarExecucaoComFalha(
                    $execucao,
                    $conta->id,
                    (int) $etapa->ordem,
                    'janela de mensagens da Meta encerrada ou sem horário de abertura conhecido',
                );

                return;
            }
        }

        if ($etapa->ehCondicaoHorario()) {
            if ($condicao->executar($execucao, $etapa, $conta)) {
                EnviarEtapaFluxo::dispatch($execucao->id);
            }

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

            if ($digitacao->executar($token, $contato->psid, 'typing_on', $conta->id)) {
                EnviarEtapaFluxo::dispatch($execucao->id, true)->delay($segundos);

                return;
            }

            // Falha no indicador não trava a execução: a mensagem segue agora.
        }

        // Encerra explicitamente o indicador antes da mensagem; a falha desta
        // ação não impede o envio, pois a mensagem também o dispensa.
        if ($this->indicadorDigitacaoTratado) {
            $digitacao->executar($token, $contato->psid, 'typing_off', $conta->id);
        }

        $tipoConteudo = (string) ($etapa->tipo_conteudo ?? MidiaEtapa::TipoTexto);

        if (MidiaEtapa::tipoValido($tipoConteudo)) {
            $dadosMensagem = $midia->executar($etapa, $conta, $contato, $token, $tipoConteudo);

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

            if (! $texto->executar($token, $contato->psid, $textoPersonalizado, $conta->id)) {
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
}
