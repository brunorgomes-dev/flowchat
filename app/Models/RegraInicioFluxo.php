<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegraInicioFluxo extends Model
{
    protected $table = 'regras_inicio_fluxo';

    protected $fillable = ['fluxo_id', 'gatilho', 'ativo'];

    public function fluxo(): BelongsTo
    {
        return $this->belongsTo(Fluxo::class);
    }
}
