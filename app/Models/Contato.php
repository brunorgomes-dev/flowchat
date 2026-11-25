<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Database\Factories\ContatoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Schema;

class Contato extends Model
{
    /** @use HasFactory<ContatoFactory> */
    use HasFactory;

    protected $fillable = ['account_id', 'psid', 'nome', 'ultima_mensagem_recebida_em'];

    protected $casts = ['ultima_mensagem_recebida_em' => 'datetime'];

    /**
     * Indica se a coluna que guarda o instante da última mensagem recebida
     * já existe. Enquanto a migration estiver pendente, os fluxos mantêm o
     * comportamento anterior à janela de 24 horas.
     */
    public static function janelaDeMensagemLivreDisponivel(): bool
    {
        return Schema::hasColumn('contatos', 'ultima_mensagem_recebida_em');
    }

    /**
     * Instante em que a janela padrão termina (24 horas), ou a janela
     * estendida de anúncio (até 7 dias desde a primeira mensagem após o
     * clique). O limite é exclusivo.
     */
    public function limiteDaJanelaDeMensagemLivre(): ?CarbonInterface
    {
        $limitePadrao = $this->ultima_mensagem_recebida_em?->copy()->addHours(24);

        if (! Schema::hasTable('origens_contato')
            || ! Schema::hasColumn('origens_contato', 'associada_em')) {
            return $limitePadrao;
        }

        $associacaoAnuncio = $this->origens()
            ->where('categoria', 'anuncio')
            ->whereNotNull('ad_id')
            ->whereNotNull('associada_em')
            ->orderByDesc('associada_em')
            ->value('associada_em');

        $limiteAnuncio = $associacaoAnuncio === null
            ? null
            : Carbon::parse($associacaoAnuncio, config('app.timezone'))->addDays(7);

        if ($limitePadrao === null || ($limiteAnuncio !== null && $limiteAnuncio->greaterThan($limitePadrao))) {
            return $limiteAnuncio;
        }

        return $limitePadrao;
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function mensagens(): HasMany
    {
        return $this->hasMany(Mensagem::class);
    }

    public function ultimaMensagem(): HasOne
    {
        return $this->hasOne(Mensagem::class)->latestOfMany();
    }

    public function execucoesFluxo(): HasMany
    {
        return $this->hasMany(ExecucaoFluxo::class);
    }

    /**
     * Histórico de origens do contato (anúncio, link ou outro referral).
     */
    public function origens(): HasMany
    {
        return $this->hasMany(OrigemContato::class);
    }

    /**
     * Origem mais recente, usada para apresentar a conversa na caixa de entrada.
     */
    public function origemMaisRecente(): HasOne
    {
        return $this->hasOne(OrigemContato::class)->latestOfMany();
    }
}
