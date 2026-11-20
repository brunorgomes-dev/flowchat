<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Support\TimestampEventoMeta;
use Carbon\Carbon;
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
     *
     * O timestamp do evento chega em milissegundos, como enviado pela Meta.
     * Quando ele está ausente ou fora da faixa válida, a janela de 24 horas
     * não é renovada (o contato fica sem janela conhecida); eventos sem
     * objeto de mensagem (read/delivery) usam mensagemRecebida = false.
     */
    public function __construct(
        public int $accountId,
        public string $psid,
        public ?string $texto,
        public ?int $timestampEventoMs = null,
        public bool $mensagemRecebida = true,
    ) {}

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

        // Eventos sem objeto de mensagem (read/delivery) não são eventos de
        // mensagem: não criam contato, não renovam a janela e não disparam
        // gatilhos de mensagem_recebida ou novo_contato.
        if (! $this->mensagemRecebida) {
            return;
        }

        $contato = $conta->contatos()->firstOrCreate(['psid' => $this->psid]);

        $this->preencherNome($contato, $conta->messengerIntegration?->page_access_token);

        $this->registrarUltimaMensagemRecebida($contato);

        if ($this->texto !== null) {
            $contato->mensagens()->create(['direcao' => 'recebida', 'texto' => $this->texto]);
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
        // (whereHas não duplica o fluxo mesmo se dois gatilhos casarem).
        $gatilhos = ['mensagem_recebida'];
        if ($contato->wasRecentlyCreated) {
            $gatilhos[] = 'novo_contato';
        }

        // Quando mais de um fluxo ativo casa com o mesmo evento, somente o
        // mais antigo inicia: disparar todos entregava duas sequências
        // intercaladas ao mesmo contato.
        $fluxo = $conta->fluxos()->where('ativo', true)
            ->whereHas('regras', fn ($consulta) => $consulta
                ->where('ativo', true)
                ->whereIn('gatilho', $gatilhos))
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

    /**
     * Registra o instante da última mensagem recebida, base da janela de
     * 24 horas da Meta. Usa o timestamp do evento (e não o momento do
     * processamento) e nunca retrocede a janela quando um evento chega
     * fora de ordem. Sem timestamp de evento válido, a janela não é
     * renovada: não se abre uma janela artificial no processamento.
     * Enquanto a migration não estiver aplicada no banco, o job continua
     * com o comportamento anterior.
     */
    private function registrarUltimaMensagemRecebida(Contato $contato): void
    {
        if (! Contato::janelaDeMensagemLivreDisponivel()) {
            return;
        }

        $instante = $this->instanteDoEvento();
        if ($instante === null) {
            return;
        }

        // Atualização condicional e monotônica: um evento atrasado não pode
        // encurtar a janela já registrada por outro mais recente.
        $atualizado = $contato->newQuery()
            ->whereKey($contato->id)
            ->where(fn ($consulta) => $consulta
                ->whereNull('ultima_mensagem_recebida_em')
                ->orWhere('ultima_mensagem_recebida_em', '<', $instante))
            ->update(['ultima_mensagem_recebida_em' => $instante]);

        if ($atualizado > 0) {
            $contato->refresh();
        }
    }

    /**
     * Instante do evento da Meta, convertido do timestamp em milissegundos.
     * Devolve null quando o payload não traz um timestamp normalizado
     * válido, para que a janela permaneça sem renovação.
     */
    private function instanteDoEvento(): ?CarbonInterface
    {
        $timestampMs = TimestampEventoMeta::normalizar($this->timestampEventoMs);

        return $timestampMs !== null
            ? Carbon::createFromTimestampMs($timestampMs)->timezone(config('app.timezone'))
            : null;
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

        // A espera automática só pode ser agendada dentro da janela de
        // mensagem livre; sem instante conhecido ou além do limite (24 h,
        // exclusivo), o agendamento não é criado.
        if (Contato::janelaDeMensagemLivreDisponivel()) {
            $limite = $contato->limiteDaJanelaDeMensagemLivre();
            if ($limite === null || $executarEm->greaterThanOrEqualTo($limite)) {
                LogSistema::create([
                    'account_id' => $conta->id,
                    'evento' => 'fluxo_aguardando_sem_janela',
                    'descricao' => "PSID {$this->psid}: fluxo {$fluxo->nome} não foi agendado porque a janela de 24 horas da Meta terminaria antes do início permitido",
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
