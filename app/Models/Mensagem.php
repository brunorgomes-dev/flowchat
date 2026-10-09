<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensagem extends Model
{
    protected $table = 'mensagens';

    protected $fillable = ['contato_id', 'direcao', 'texto'];

    public function contato(): BelongsTo
    {
        return $this->belongsTo(Contato::class);
    }
}
