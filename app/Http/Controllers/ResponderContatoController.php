<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Illuminate\Http\Client\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ResponderContatoController extends Controller
{
    /**
     * Envia uma resposta manual de texto para o contato pelo Messenger.
     */
    public function __invoke(Request $request, int $contato): RedirectResponse
    {
        $contato = $request->user()->account->contatos()->findOrFail($contato);
        $dados = $request->validate([
            // A Graph API aceita até 640 caracteres por mensagem de texto
            'texto' => ['required', 'string', 'max:640'],
        ]);

        $token = $request->user()->account->messengerIntegration?->page_access_token;

        if (! $token) {
            LogSistema::create(['account_id' => $contato->account_id, 'evento' => 'erro_envio', 'descricao' => 'Token da Página do Messenger não configurado']);

            return redirect()->back()->withErrors(['texto' => 'Envio pelo Messenger não está configurado.']);
        }

        $resposta = Http::connectTimeout(3)
            ->timeout(10)
            ->withToken($token)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $contato->psid],
                'message' => ['text' => $dados['texto']],
            ]);

        if (! $resposta->successful()) {
            // Detalhe técnico fica apenas no log; a interface não o expõe.
            // Registra somente campos conhecidos do erro, sem o corpo bruto.
            LogSistema::create([
                'account_id' => $contato->account_id,
                'evento' => 'erro_envio',
                'descricao' => 'Resposta manual rejeitada: '.$this->resumoErroMeta($resposta),
            ]);

            return redirect()->back()->withErrors(['texto' => 'A Graph API rejeitou o envio para este contato.']);
        }

        Mensagem::create([
            'contato_id' => $contato->id,
            'direcao' => 'enviada',
            'texto' => $dados['texto'],
        ]);
        LogSistema::create([
            'account_id' => $contato->account_id,
            'evento' => 'mensagem_manual_enviada',
            'descricao' => "Resposta manual enviada ao PSID {$contato->psid}",
        ]);

        return redirect()->back();
    }

    private function resumoErroMeta(Response $resposta): string
    {
        $erro = $resposta->json('error');

        if (! is_array($erro)) {
            return 'HTTP '.$resposta->status();
        }

        $partes = [];

        foreach (['code' => 'code', 'error_subcode' => 'subcode', 'message' => 'message'] as $chave => $rotulo) {
            $valor = $erro[$chave] ?? null;

            if (is_scalar($valor) && (string) $valor !== '') {
                $partes[] = $rotulo.'='.mb_substr((string) $valor, 0, 200);
            }
        }

        return 'HTTP '.$resposta->status().($partes === [] ? '' : ' — '.implode(' | ', $partes));
    }
}
