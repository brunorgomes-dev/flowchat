<?php

namespace App\Models;

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
     * Instante em que a janela de 24 horas termina. É um limite exclusivo:
     * a Meta não permite mensagem livre nele nem depois dele. Devolve null
     * quando o contato ainda não enviou mensagem.
     */
    public function limiteDaJanelaDeMensagemLivre(): ?CarbonInterface
    {
        return $this->ultima_mensagem_recebida_em?->copy()->addHours(24);
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
