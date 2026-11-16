<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CondicaoHorarioEtapa extends Model
{
    protected $table = 'condicoes_horario_etapa';

    protected $fillable = ['etapa_fluxo_id', 'ordem', 'inicio', 'fim', 'destino_ordem'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'destino_ordem' => 'integer',
        ];
    }

    public function etapa(): BelongsTo
    {
        return $this->belongsTo(EtapaFluxo::class, 'etapa_fluxo_id');
    }
}
