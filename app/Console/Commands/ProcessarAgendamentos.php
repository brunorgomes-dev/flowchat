<?php

namespace App\Console\Commands;

use App\Jobs\ExecutarAgendamento;
use App\Models\Agendamento;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('agendamentos:processar')]
#[Description('Localiza agendamentos pendentes vencidos e os envia para a fila')]
class ProcessarAgendamentos extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        Agendamento::where('estado', 'pendente')
            ->where('executar_em', '<=', now())
            ->pluck('id')
            ->each(fn (int $id) => ExecutarAgendamento::dispatch($id));
    }
}
