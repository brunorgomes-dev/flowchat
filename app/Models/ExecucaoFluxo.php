<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExecucaoFluxo extends Model
{
    protected $table = 'execucoes_fluxo';

    protected $fillable = ['contato_id', 'fluxo_id', 'etapa_atual', 'concluida_em'];

    public function contato(): BelongsTo
    {
        return $this->belongsTo(Contato::class);
    }

    public function fluxo(): BelongsTo
    {
        return $this->belongsTo(Fluxo::class);
    }
}
