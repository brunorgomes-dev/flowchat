<?php

namespace App\Actions\Fluxos;

use App\Jobs\EnviarEtapaFluxo;
use App\Models\Account;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\OrigemContato;
use App\Support\Contatos\JanelaDeMensagemLivre;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Decide se o evento inicia um fluxo automático e, quando inicia, cria a
 * execução e enfileira a primeira etapa.
 */
final class IniciarFluxosDoContato
{
    public function __construct(private readonly JanelaDeMensagemLivre $janela) {}

    public function executar(Account $conta, Contato $contato): void
    {
        $novoContato = $contato->wasRecentlyCreated;

        DB::transaction(function () use ($conta, $contato, $novoContato): void {
            $contatoBloqueado = Contato::query()
                ->where('account_id', $conta->id)
                ->lockForUpdate()
                ->find($contato->id);

            if ($contatoBloqueado === null) {
                return;
            }

            $this->iniciarComContatoBloqueado($conta, $contatoBloqueado, $novoContato);
        });
    }

    private function iniciarComContatoBloqueado(Account $conta, Contato $contato, bool $novoContato): void
    {
        $suportaGatilhoAnuncio = Schema::hasTable('origens_contato')
            && Schema::hasColumn('regras_inicio_fluxo', 'ad_id')
            && Schema::hasColumn('origens_contato', 'associada_em')
            && Schema::hasColumn('origens_contato', 'contato_criado_pela_origem');
        $origemAnuncio = $suportaGatilhoAnuncio
            ? OrigemContato::query()
                ->where('account_id', $conta->id)
                ->where('contato_id', $contato->id)
                ->where('categoria', 'anuncio')
                ->whereNotNull('ad_id')
                ->whereNull('associada_em')
                ->where('created_at', '>=', now()->subDays(7))
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first()
            : null;

        $adId = $origemAnuncio?->ad_id;
        if ($origemAnuncio !== null) {
            // O prazo estendido de anúncio começa na primeira mensagem da
            // pessoa após o clique, não no momento em que a fila processa.
            $origemAnuncio->update([
                'associada_em' => $contato->ultima_mensagem_recebida_em ?? now(),
            ]);
            $novoContato = $novoContato || $origemAnuncio->contato_criado_pela_origem;
        }

        // Não inicia novo fluxo se já existe execução em andamento
        $emAndamento = ExecucaoFluxo::where('contato_id', $contato->id)
            ->whereNull('concluida_em')
            ->exists();
        if ($emAndamento) {
            return;
        }

        // Gatilhos aplicáveis ao evento; um mesmo fluxo inicia uma única vez
        // (whereHas não duplica o fluxo mesmo se dois gatilhos casarem).
        $gatilhos = ['mensagem_recebida'];
        if ($novoContato) {
            $gatilhos[] = 'novo_contato';
        }

        // A correspondência do anúncio tem prioridade sobre gatilhos genéricos.
        $fluxo = $suportaGatilhoAnuncio && $adId !== null
            ? $conta->fluxos()->where('ativo', true)
                ->whereHas('regras', fn ($consulta) => $consulta
                    ->where('ativo', true)
                    ->where('gatilho', 'mensagem_recebida')
                    ->where('ad_id', $adId))
                ->orderBy('id')
                ->first()
            : null;

        // Sem fluxo específico para este anúncio, usa os gatilhos genéricos.
        // Entre fluxos genéricos, somente o mais antigo inicia.
        $fluxo ??= $conta->fluxos()->where('ativo', true)
            ->whereHas('regras', function ($consulta) use ($gatilhos, $suportaGatilhoAnuncio): void {
                $consulta->where('ativo', true)->whereIn('gatilho', $gatilhos);
                if ($suportaGatilhoAnuncio) {
                    $consulta->whereNull('ad_id');
                }
            })
            ->orderBy('id')
            ->first();

        if ($fluxo === null) {
            return;
        }

        // A janela de horário controla apenas o início automático do fluxo;
        // a execução manual e os agendamentos existentes não são afetados.
        $fuso = $conta->timezone ?: config('app.timezone');
        $agoraLocal = now($fuso);
        if ($fluxo->horarioInicioConfigurado() && ! $fluxo->dentroDoHorarioInicio($agoraLocal)) {
            $this->tratarInicioForaDoHorario($contato, $fluxo, $agoraLocal);

            return;
        }

        // Um início direto substitui agendamentos pendentes já vencidos do
        // mesmo fluxo e contato, evitando uma segunda execução do mesmo evento
        $substituidos = $conta->agendamentos()->where('fluxo_id', $fluxo->id)
            ->where('contato_id', $contato->id)
            ->where('estado', 'pendente')
            ->where('executar_em', '<=', now())
            ->update(['estado' => 'cancelado']);

        if ($substituidos > 0) {
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'agendamento_cancelado',
                'descricao' => "Agendamento vencido do fluxo {$fluxo->nome} cancelado porque o fluxo foi iniciado diretamente pelo PSID {$contato->psid}",
            ]);
        }

        $execucao = $conta->execucoes()->create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        LogSistema::create(['account_id' => $conta->id, 'evento' => 'fluxo_iniciado', 'descricao' => "PSID {$contato->psid} iniciou o fluxo {$fluxo->nome}"]);

        EnviarEtapaFluxo::dispatch($execucao->id);
    }

    /**
     * Aplica o comportamento configurado quando a mensagem chega fora da
     * janela permitida de início do fluxo.
     */
    private function tratarInicioForaDoHorario(Contato $contato, Fluxo $fluxo, CarbonInterface $agoraLocal): void
    {
        $conta = $contato->account;
        if ($fluxo->fora_horario !== 'aguardar') {
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'fluxo_fora_horario',
                'descricao' => "PSID {$contato->psid}: fluxo {$fluxo->nome} fora do horário permitido, início não realizado",
            ]);

            return;
        }

        // Evita agendamentos duplicados para o mesmo fluxo e contato,
        // inclusive quando o webhook recebe novamente o mesmo evento
        $jaPendente = $conta->agendamentos()->where('fluxo_id', $fluxo->id)
            ->where('contato_id', $contato->id)
            ->where('estado', 'pendente')
            ->exists();

        if ($jaPendente) {
            return;
        }

        $executarEm = $fluxo->proximoInicioPermitido($agoraLocal)?->timezone(config('app.timezone'));
        if ($executarEm === null) {
            return;
        }

        // A espera automática só pode ser agendada dentro da janela de
        // mensagem livre; sem instante conhecido ou além do limite (24 h,
        // exclusivo), o agendamento não é criado.
        if ($this->janela->disponivel()) {
            $limite = $this->janela->limite($contato);
            if ($limite === null || $executarEm->greaterThanOrEqualTo($limite)) {
                LogSistema::create([
                    'account_id' => $conta->id,
                    'evento' => 'fluxo_aguardando_sem_janela',
                    'descricao' => "PSID {$contato->psid}: fluxo {$fluxo->nome} não foi agendado porque a janela de 24 horas da Meta terminaria antes do início permitido",
                ]);

                return;
            }
        }

        $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => $executarEm,
            'estado' => 'pendente',
        ]);

        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'fluxo_aguardando_horario',
            'descricao' => "PSID {$contato->psid}: fluxo {$fluxo->nome} agendado para {$executarEm->format('d/m/Y H:i')}",
        ]);
    }
}
