<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrigemContato extends Model
{
    protected $table = 'origens_contato';

    protected $fillable = [
        'account_id',
        'contato_id',
        'evento',
        'categoria',
        'source',
        'type',
        'referencia',
        'referer_uri',
        'ad_id',
        'ad_title',
        'post_id',
        'product_id',
        'flow_id',
        'photo_url',
        'video_url',
        'mensagem_inicial',
        'dados_brutos',
    ];

    /**
     * O payload bruto fica disponível apenas no backend para auditoria.
     *
     * @var list<string>
     */
    protected $hidden = ['dados_brutos'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dados_brutos' => 'array',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function contato(): BelongsTo
    {
        return $this->belongsTo(Contato::class);
    }

    /**
     * Origens provenientes de anúncios do Facebook.
     */
    public function scopeDeAnuncio(Builder $consulta): Builder
    {
        return $consulta->where('categoria', 'anuncio');
    }

    /**
     * Filtra pelo identificador do anúncio, sempre no escopo da conta.
     */
    public function scopeComAdId(Builder $consulta, string $adId): Builder
    {
        return $consulta->where('ad_id', $adId);
    }
}
