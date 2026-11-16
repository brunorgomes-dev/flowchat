<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('flowchat:criar-administrador')]
#[Description('Cria a primeira conta/usuário administrador da plataforma (somente console)')]
class CriarAdministradorPlataforma extends Command
{
    /**
     * Executa o bootstrap do primeiro administrador.
     *
     * A autorização administrativa vem exclusivamente da allowlist
     * FLOWCHAT_PLATFORM_ADMIN_EMAILS; este comando apenas cria a conta e o
     * usuário que poderão usá-la. Não há senha padrão nem promoção de um
     * usuário preexistente.
     */
    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Este comando exige entrada interativa; nenhuma conta foi criada.');

            return self::FAILURE;
        }

        $permitidos = config('flowchat.administradores_plataforma', []);
        if (! is_array($permitidos) || $permitidos === []) {
            $this->error('A allowlist FLOWCHAT_PLATFORM_ADMIN_EMAILS está vazia. Configure o email no ambiente protegido antes de executar este comando.');

            return self::FAILURE;
        }

        $this->info('Este comando cria uma nova conta e usuário administrador. Ele não altera usuário existente nem concede acesso fora da allowlist configurada.');

        $nome = trim((string) $this->ask('Nome do administrador'));
        $email = mb_strtolower(trim((string) $this->ask('Email do administrador')));

        $validador = Validator::make(
            ['name' => $nome, 'email' => $email],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255'],
            ],
            [
                'name.required' => 'Informe o nome do administrador.',
                'name.max' => 'O nome deve ter no máximo 255 caracteres.',
                'email.required' => 'Informe o email do administrador.',
                'email.email' => 'Informe um endereço de email válido.',
                'email.max' => 'O email deve ter no máximo 255 caracteres.',
            ],
        );

        if ($validador->fails()) {
            foreach ($validador->errors()->all() as $erro) {
                $this->error($erro);
            }

            return self::FAILURE;
        }

        if (! in_array($email, $permitidos, true)) {
            $this->error('O email informado não está na allowlist FLOWCHAT_PLATFORM_ADMIN_EMAILS. Adicione-o no ambiente protegido antes de criar a conta.');

            return self::FAILURE;
        }

        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            $this->warn('Já existe um usuário com este email. Nenhuma conta, senha ou permissão foi alterada.');
            $this->line('A autorização administrativa é concedida pela allowlist configurada. Para trocar a senha, use o procedimento de rotação por console documentado.');

            return self::FAILURE;
        }

        $senha = (string) $this->secret('Senha (mínimo 12 caracteres, com letras e números)');
        $confirmacao = (string) $this->secret('Confirme a senha');

        if ($senha !== $confirmacao) {
            $this->error('A confirmação da senha não coincide; nenhuma conta foi criada.');

            return self::FAILURE;
        }

        $validadorSenha = Validator::make(
            ['password' => $senha],
            ['password' => ['required', 'string', Password::min(12)->letters()->numbers()]],
            [
                'password.required' => 'Informe a senha.',
                'password.min' => 'A senha deve ter pelo menos 12 caracteres.',
                'password.letters' => 'A senha deve conter letras.',
                'password.numbers' => 'A senha deve conter números.',
            ],
        );

        if ($validadorSenha->fails()) {
            foreach ($validadorSenha->errors()->all() as $erro) {
                $this->error($erro);
            }

            return self::FAILURE;
        }

        if (! $this->confirm('Criar uma nova conta e usuário para o email informado?', false)) {
            $this->info('Operação cancelada; nenhuma conta foi criada.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($nome, $email, $senha): void {
            $conta = Account::create(['name' => $nome]);

            User::create([
                'account_id' => $conta->id,
                'name' => $nome,
                'email' => $email,
                'password' => $senha,
            ]);
        });

        $this->info('Conta e usuário administrador criados.');
        $this->line('O acesso administrativo é concedido pela allowlist configurada; não existe senha padrão nem promoção automática de outros usuários.');

        return self::SUCCESS;
    }
}
