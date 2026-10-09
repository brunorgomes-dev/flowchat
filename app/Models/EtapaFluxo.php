<?php

namespace App\Models;

use Database\Factories\EtapaFluxoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EtapaFluxo extends Model
{
    /** @use HasFactory<EtapaFluxoFactory> */
    use HasFactory;

    protected $table = 'etapas_fluxo';

    protected $fillable = ['fluxo_id', 'ordem', 'texto', 'pausa_segundos'];

    public function fluxo(): BelongsTo
    {
        return $this->belongsTo(Fluxo::class);
    }
}
