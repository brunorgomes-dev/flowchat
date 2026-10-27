<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Agendamento extends Model
{
    protected $fillable = ['fluxo_id', 'contato_id', 'executar_em', 'estado'];

    protected $casts = ['executar_em' => 'datetime'];

    public function fluxo(): BelongsTo
    {
        return $this->belongsTo(Fluxo::class);
    }

    public function contato(): BelongsTo
    {
        return $this->belongsTo(Contato::class);
    }
}
