<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class ProcessarMensagemEntrante implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $accountId, public string $psid, public ?string $texto) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Identificar e salvar contato
        $conta = Account::find($this->accountId);
        if ($conta === null || $conta->estaSuspensa()) {
            return;
        }

        $contato = $conta->contatos()->firstOrCreate(['psid' => $this->psid]);

        $this->preencherNome($contato, $conta->messengerIntegration?->page_access_token);

        if ($this->texto !== null) {
            $contato->mensagens()->create(['direcao' => 'recebida', 'texto' => $this->texto]);
            $this->registrarUltimaMensagemRecebida($contato);
            // O texto integral fica apenas na tabela de mensagens; o log
            // funcional registra o evento sem expor a conversa.
            LogSistema::create(['account_id' => $conta->id, 'evento' => 'mensagem_recebida', 'descricao' => "Mensagem recebida do PSID {$this->psid}"]);
            $this->preencherMensagemInicialDaOrigem($contato, $this->texto);
        }

        // Não inicia novo fluxo se já existe execução em andamento
        $emAndamento = ExecucaoFluxo::where('contato_id', $contato->id)
            ->whereNull('concluida_em')
            ->exists();
        if ($emAndamento) {
            return;
        }

        // Gatilhos aplicáveis ao evento; um mesmo fluxo inicia uma única vez
        // (whereHas não duplica o fluxo mesmo se dois gatilhos casarem)
        $gatilhos = ['mensagem_recebida'];
        if ($contato->wasRecentlyCreated) {
            $gatilhos[] = 'novo_contato';
        }

        $fluxos = $conta->fluxos()->where('ativo', true)
            ->whereHas('regras', fn ($consulta) => $consulta
                ->where('ativo', true)
                ->whereIn('gatilho', $gatilhos))
            ->orderBy('id')
            ->get();

        foreach ($fluxos as $fluxo) {
            // A janela de horário controla apenas o início automático do fluxo;
            // a execução manual e os agendamentos existentes não são afetados.
            $fuso = $conta->timezone ?: config('app.timezone');
            $agoraLocal = now($fuso);
            if ($fluxo->horarioInicioConfigurado() && ! $fluxo->dentroDoHorarioInicio($agoraLocal)) {
                $this->tratarInicioForaDoHorario($contato, $fluxo, $agoraLocal);

                continue;
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
                    'descricao' => "Agendamento vencido do fluxo {$fluxo->nome} cancelado porque o fluxo foi iniciado diretamente pelo PSID {$this->psid}",
                ]);
            }

            $execucao = $conta->execucoes()->create([
                'contato_id' => $contato->id,
                'fluxo_id' => $fluxo->id,
                'etapa_atual' => 1,
            ]);

            LogSistema::create(['account_id' => $conta->id, 'evento' => 'fluxo_iniciado', 'descricao' => "PSID {$this->psid} iniciou o fluxo {$fluxo->nome}"]);

            EnviarEtapaFluxo::dispatch($execucao->id);
        }
    }

    /**
     * Registra o instante da última mensagem de texto recebida. É a base da
     * janela de 24 horas da Meta: eventos sem texto (delivery/read) não
     * contam. Enquanto a migration não estiver aplicada no banco, o job
     * continua com o comportamento anterior.
     */
    private function registrarUltimaMensagemRecebida(Contato $contato): void
    {
        if (! Schema::hasColumn('contatos', 'ultima_mensagem_recebida_em')) {
            return;
        }

        $contato->update(['ultima_mensagem_recebida_em' => now()]);
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
                'descricao' => "PSID {$this->psid}: fluxo {$fluxo->nome} fora do horário permitido, início não realizado",
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

        $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => $executarEm,
            'estado' => 'pendente',
        ]);

        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'fluxo_aguardando_horario',
            'descricao' => "PSID {$this->psid}: fluxo {$fluxo->nome} agendado para {$executarEm->format('d/m/Y H:i')}",
        ]);
    }

    /**
     * Completa a mensagem inicial de uma origem recente que ainda não a tem.
     * O referral de anúncio pode chegar num postback antes da primeira
     * mensagem de texto; nesse caso o texto real é preservado aqui.
     */
    private function preencherMensagemInicialDaOrigem(Contato $contato, string $texto): void
    {
        if (! Schema::hasTable('origens_contato') || trim($texto) === '') {
            return;
        }

        $origem = $contato->origens()
            ->whereNull('mensagem_inicial')
            ->where('created_at', '>=', now()->subDay())
            ->latest('id')
            ->first();

        if ($origem !== null) {
            $origem->update(['mensagem_inicial' => $texto]);
        }
    }

    /**
     * Busca o nome do perfil do contato na Graph API, se ainda não tiver nome salvo.
     */
    private function preencherNome(Contato $contato, ?string $token): void
    {
        if ($contato->nome !== null && $contato->nome !== '') {
            return;
        }

        if (! $token) {
            return;
        }

        $resposta = Http::get(config('services.messenger.api_url').'/'.$contato->psid, [
            'fields' => 'first_name,last_name',
            'access_token' => $token,
        ]);

        if (! $resposta->successful()) {
            return;
        }

        $partes = [$resposta->json('first_name') ?? '', $resposta->json('last_name') ?? ''];
        $nome = trim(implode(' ', array_filter($partes)));

        if ($nome === '') {
            return;
        }

        $contato->update(['nome' => $nome]);
    }
}
