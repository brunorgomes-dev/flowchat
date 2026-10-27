<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ResponderContatoController extends Controller
{
    /**
     * Envia uma resposta manual de texto para o contato pelo Messenger.
     */
    public function __invoke(Request $request, Contato $contato): RedirectResponse
    {
        $dados = $request->validate([
            // A Graph API aceita até 640 caracteres por mensagem de texto
            'texto' => ['required', 'string', 'max:640'],
        ]);

        $token = config('services.messenger.page_access_token');

        if (! $token) {
            LogSistema::create(['evento' => 'erro_envio', 'descricao' => 'MESSENGER_PAGE_ACCESS_TOKEN não configurado']);

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
            // Detalhe técnico fica apenas no log; a interface não o expõe
            LogSistema::create([
                'evento' => 'erro_envio',
                'descricao' => 'Resposta manual rejeitada (HTTP '.$resposta->status().'): '.$resposta->body(),
            ]);

            return redirect()->back()->withErrors(['texto' => 'A Graph API rejeitou o envio para este contato.']);
        }

        Mensagem::create([
            'contato_id' => $contato->id,
            'direcao' => 'enviada',
            'texto' => $dados['texto'],
        ]);
        LogSistema::create([
            'evento' => 'mensagem_manual_enviada',
            'descricao' => "Resposta manual enviada ao PSID {$contato->psid}",
        ]);

        return redirect()->back();
    }
}
