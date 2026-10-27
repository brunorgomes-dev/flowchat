<?php

namespace App\Models;

use Database\Factories\FluxoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fluxo extends Model
{
    /** @use HasFactory<FluxoFactory> */
    use HasFactory;

    protected $fillable = ['nome', 'ativo'];

    public function etapas(): HasMany
    {
        return $this->hasMany(EtapaFluxo::class)->orderBy('ordem');
    }

    public function execucoes(): HasMany
    {
        return $this->hasMany(ExecucaoFluxo::class);
    }

    public function regras(): HasMany
    {
        return $this->hasMany(RegraInicioFluxo::class);
    }
}
