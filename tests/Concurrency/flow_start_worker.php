<?php

use App\Actions\Fluxos\IniciarFluxosDoContato;
use App\Http\Controllers\ExecutarFluxoController;
use App\Jobs\ExecutarAgendamento;
use App\Models\Account;
use App\Models\Contato;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[$script, $role, $accountId, $contactId, $automaticFlowId, $otherFlowId, $appointmentId, $barrier, $workerId] = $argv;

file_put_contents($barrier.DIRECTORY_SEPARATOR.$workerId.'.ready', 'ready');
$deadline = microtime(true) + 25;
while (count(glob($barrier.DIRECTORY_SEPARATOR.'*.ready') ?: []) < 2) {
    if (microtime(true) > $deadline) {
        fwrite(STDERR, "Worker barrier timed out.\n");
        exit(1);
    }
    usleep(20_000);
}

// Hold the transaction after the empty-execution check. Without the shared
// contact lock, both processes pass this point before either inserts a run.
DB::listen(static function (QueryExecuted $query): void {
    $sql = strtolower($query->sql);
    if (str_contains($sql, 'execucoes_fluxo') && str_contains($sql, 'exists')) {
        usleep(2_000_000);
    }
});

$account = Account::query()->findOrFail((int) $accountId);
$contact = Contato::query()->findOrFail((int) $contactId);

if ($role === 'message') {
    app(IniciarFluxosDoContato::class)->executar($account, $contact);
    exit(0);
}

if ($role === 'schedule') {
    (new ExecutarAgendamento((int) $appointmentId))->handle();
    exit(0);
}

if ($role === 'manual') {
    $user = User::query()->where('account_id', $account->id)->firstOrFail();
    $request = Request::create('/execucoes/manuais', 'POST', [
        'fluxo_id' => (int) $otherFlowId,
        'contato_id' => $contact->id,
    ]);
    $request->setUserResolver(static fn () => $user);
    app(ExecutarFluxoController::class)($request);
    exit(0);
}

fwrite(STDERR, "Unknown worker role.\n");
exit(2);
