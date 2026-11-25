<?php

use App\Models\ExecucaoFluxo;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$connection = config('database.connections.mysql');
if (getenv('FLOWCHAT_MYSQL_CONCURRENCY_TEST') !== '1'
    || config('database.default') !== 'mysql'
    || ($connection['host'] ?? null) !== '127.0.0.1'
    || (int) ($connection['port'] ?? 0) !== 3308
    || ($connection['database'] ?? null) !== 'flowchat_concurrency_test'
    || ($connection['username'] ?? null) !== 'flowchat_test') {
    fwrite(STDERR, "Refusing to run: this harness only accepts the isolated MySQL test container on 127.0.0.1:3308.\n");
    exit(2);
}

DB::connection()->getPdo();
Artisan::call('migrate:fresh', ['--force' => true]);

$workerPath = __DIR__.'/flow_start_worker.php';
$scenarios = ['message-message', 'manual-message', 'schedule-message'];

foreach ($scenarios as $scenario) {
    $user = User::factory()->create();
    $account = $user->account;
    $contact = $account->contatos()->create([
        'psid' => 'concurrency-'.$scenario,
        'ultima_mensagem_recebida_em' => now(),
    ]);
    $automaticFlow = $account->fluxos()->create(['nome' => 'Automático', 'ativo' => true]);
    $automaticFlow->etapas()->create(['ordem' => 1, 'texto' => 'Auto', 'pausa_segundos' => 0]);
    $automaticFlow->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);
    $otherFlow = $account->fluxos()->create(['nome' => 'Concorrente', 'ativo' => true]);
    $otherFlow->etapas()->create(['ordem' => 1, 'texto' => 'Concorrente', 'pausa_segundos' => 0]);

    $appointmentId = 0;
    if ($scenario === 'schedule-message') {
        $appointmentId = $account->agendamentos()->create([
            'fluxo_id' => $otherFlow->id,
            'contato_id' => $contact->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ])->id;
    }

    $barrier = sys_get_temp_dir().DIRECTORY_SEPARATOR.'flowchat-concurrency-'.$scenario.'-'.bin2hex(random_bytes(5));
    mkdir($barrier);

    $roles = match ($scenario) {
        'message-message' => ['message', 'message'],
        'manual-message' => ['manual', 'message'],
        'schedule-message' => ['schedule', 'message'],
    };

    $processes = [];
    foreach ($roles as $index => $role) {
        $process = new Process([
            PHP_BINARY,
            $workerPath,
            $role,
            (string) $account->id,
            (string) $contact->id,
            (string) $automaticFlow->id,
            (string) $otherFlow->id,
            (string) $appointmentId,
            $barrier,
            (string) $index,
        ], dirname(__DIR__, 2));
        $process->setTimeout(40);
        $process->start();
        $processes[] = $process;
    }

    foreach ($processes as $process) {
        $process->wait();
        if (! $process->isSuccessful()) {
            fwrite(STDERR, $process->getErrorOutput().$process->getOutput());
            exit(1);
        }
    }

    $count = ExecucaoFluxo::query()->where('contato_id', $contact->id)->count();
    if ($count !== 1) {
        fwrite(STDERR, "{$scenario}: expected exactly one execution; found {$count}.\n");
        exit(1);
    }

    array_map('unlink', glob($barrier.DIRECTORY_SEPARATOR.'*.ready') ?: []);
    rmdir($barrier);
    fwrite(STDOUT, "PASS {$scenario}: one execution for contact {$contact->id}.\n");
}

fwrite(STDOUT, "All MySQL 8.4 concurrent-start scenarios passed.\n");
