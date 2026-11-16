<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Convite extends Model
{
    protected $fillable = [
        'email',
        'token_hash',
        'emitido_por',
        'resgatado_por',
        'expira_em',
        'resgatado_em',
        'revogado_em',
    ];

    protected function casts(): array
    {
        return [
            'expira_em' => 'datetime',
            'resgatado_em' => 'datetime',
            'revogado_em' => 'datetime',
        ];
    }

    public function emissor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emitido_por');
    }

    public function utilizadorResgatado(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resgatado_por');
    }

    public function disponivel(): bool
    {
        return $this->resgatado_em === null
            && $this->revogado_em === null
            && $this->expira_em?->isFuture() === true;
    }
}
