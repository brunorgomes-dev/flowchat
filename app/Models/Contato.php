<?php

namespace App\Models;

use Database\Factories\ContatoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contato extends Model
{
    /** @use HasFactory<ContatoFactory> */
    use HasFactory;

    protected $fillable = ['psid', 'nome'];

    public function mensagens(): HasMany
    {
        return $this->hasMany(Mensagem::class);
    }

    public function execucoesFluxo(): HasMany
    {
        return $this->hasMany(ExecucaoFluxo::class);
    }
}
