<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Recupera agendamentos pendentes vencidos (fila sobrevive a interrupções)
Schedule::command('agendamentos:processar')->everyMinute();
