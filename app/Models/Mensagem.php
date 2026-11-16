<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensagem extends Model
{
    protected $table = 'mensagens';

    protected $fillable = [
        'contato_id',
        'direcao',
        'texto',
        'tipo_conteudo',
        'anexo_caminho',
        'anexo_nome_original',
        'anexo_mime',
        'anexo_tamanho_bytes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'anexo_tamanho_bytes' => 'integer',
        ];
    }

    public function contato(): BelongsTo
    {
        return $this->belongsTo(Contato::class);
    }
}
