<?php

namespace App\Models;

use Database\Factories\ContatoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Contato extends Model
{
    /** @use HasFactory<ContatoFactory> */
    use HasFactory;

    protected $fillable = ['account_id', 'psid', 'nome'];

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
