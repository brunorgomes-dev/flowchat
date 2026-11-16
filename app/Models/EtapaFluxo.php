<?php

namespace App\Models;

use Database\Factories\EtapaFluxoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EtapaFluxo extends Model
{
    /** @use HasFactory<EtapaFluxoFactory> */
    use HasFactory;

    protected $table = 'etapas_fluxo';

    protected $fillable = [
        'fluxo_id',
        'ordem',
        'tipo',
        'texto',
        'tipo_conteudo',
        'anexo_caminho',
        'anexo_nome_original',
        'anexo_mime',
        'anexo_tamanho_bytes',
        'anexo_attachment_id',
        'anexo_attachment_page_id',
        'anexo_attachment_expira_em',
        'pausa_segundos',
        'indicador_digitacao_ativo',
        'indicador_digitacao_segundos',
        'destino_nao_ordem',
        'encerra_apos',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'indicador_digitacao_ativo' => 'boolean',
            'indicador_digitacao_segundos' => 'integer',
            'destino_nao_ordem' => 'integer',
            'encerra_apos' => 'boolean',
            'anexo_tamanho_bytes' => 'integer',
            'anexo_attachment_expira_em' => 'datetime',
        ];
    }

    public function fluxo(): BelongsTo
    {
        return $this->belongsTo(Fluxo::class);
    }

    public function condicoes(): HasMany
    {
        return $this->hasMany(CondicaoHorarioEtapa::class)->orderBy('ordem');
    }

    /**
     * Indica se esta etapa é um bloco de condição por horário.
     */
    public function ehCondicaoHorario(): bool
    {
        return $this->tipo === 'condicao_horario';
    }
}
