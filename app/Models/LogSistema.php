<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogSistema extends Model
{
    /**
     * Eventos internos de administração/suspensão que não devem aparecer na
     * atividade exibida ao cliente. Continuam gravados em `logs` para auditoria.
     *
     * @var list<string>
     */
    public const EVENTOS_OCULTOS_ATIVIDADE_CLIENTE = [
        'conta_suspensa',
        'conta_reativada',
        'fluxo_encerrado_conta_suspensa',
        'agendamento_nao_executado_conta_suspensa',
    ];

    protected $table = 'logs';

    protected $fillable = ['account_id', 'evento', 'descricao'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
