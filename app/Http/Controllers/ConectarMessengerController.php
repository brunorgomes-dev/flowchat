<?php

namespace App\Http\Controllers;

use App\Models\MessengerIntegration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ConectarMessengerController extends Controller
{
    /**
     * Inicia a autorização do Facebook para conectar uma Página à conta.
     */
    public function redirecionar(Request $request): RedirectResponse
    {
        $appId = config('services.messenger.app_id');
        $appSecret = config('services.messenger.app_secret');

        if (! is_string($appId) || $appId === '' || ! is_string($appSecret) || $appSecret === '') {
            return redirect()->route('configuracoes.index')->withErrors([
                'messenger' => 'A conexão pelo Facebook ainda não foi configurada pelo FlowChat.',
            ]);
        }

        $estado = Str::random(64);
        $request->session()->put('messenger_oauth_state', $estado);

        $parametros = [
            'client_id' => $appId,
            'redirect_uri' => route('messenger.oauth.retorno'),
            'state' => $estado,
            'response_type' => 'code',
        ];

        $configuracaoLogin = config('services.messenger.login_config_id');
        if (is_string($configuracaoLogin) && $configuracaoLogin !== '') {
            // A configuração do Login para Empresas reúne as permissões
            // aprovadas no painel Meta para a integração Messenger.
            $parametros['config_id'] = $configuracaoLogin;
            $parametros['override_default_response_type'] = 'true';
        } else {
            $parametros['scope'] = implode(',', [
                'pages_show_list',
                'pages_messaging',
                'pages_manage_metadata',
            ]);
        }

        $url = 'https://www.facebook.com/v23.0/dialog/oauth?'.http_build_query($parametros, '', '&', PHP_QUERY_RFC3986);

        return redirect()->away($url);
    }

    /**
     * Troca o código OAuth por uma autorização e carrega as Páginas disponíveis.
     */
    public function retorno(Request $request): RedirectResponse
    {
        $estadoEsperado = $request->session()->pull('messenger_oauth_state');
        $estadoRecebido = $request->query('state');

        if (! is_string($estadoEsperado) || ! is_string($estadoRecebido)
            || ! hash_equals($estadoEsperado, $estadoRecebido)) {
            return $this->falha($request, 'A confirmação de segurança do Facebook expirou. Inicie a conexão novamente.');
        }

        if ($request->query('error') !== null) {
            return $this->falha($request, 'A autorização do Facebook foi cancelada ou não foi concedida.');
        }

        $codigo = $request->query('code');
        if (! is_string($codigo) || $codigo === '') {
            return $this->falha($request, 'O Facebook não concluiu a autorização. Tente conectar novamente.');
        }

        $appId = config('services.messenger.app_id');
        $appSecret = config('services.messenger.app_secret');
        $callback = route('messenger.oauth.retorno');
        $baseApi = config('services.messenger.api_url');

        if (! is_string($appId) || $appId === '' || ! is_string($appSecret) || $appSecret === '') {
            return $this->falha($request, 'O aplicativo Meta do FlowChat ainda não está configurado.');
        }

        try {
            $respostaCodigo = Http::connectTimeout(5)->timeout(15)->get($baseApi.'/oauth/access_token', [
                'client_id' => $appId,
                'client_secret' => $appSecret,
                'redirect_uri' => $callback,
                'code' => $codigo,
            ]);

            $tokenUtilizador = $respostaCodigo->json('access_token');
            if (! $respostaCodigo->successful() || ! is_string($tokenUtilizador) || $tokenUtilizador === '') {
                return $this->falha($request, 'O Facebook não forneceu uma autorização válida. Confira a configuração do aplicativo Meta.');
            }

            // Estende o token de usuário antes de obter o token da Página,
            // reduzindo a chance de a conexão perder validade logo após o login.
            $respostaEstendida = Http::connectTimeout(5)->timeout(15)->get($baseApi.'/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $appId,
                'client_secret' => $appSecret,
                'fb_exchange_token' => $tokenUtilizador,
            ]);

            $tokenEstendido = $respostaEstendida->json('access_token');
            if (! $respostaEstendida->successful() || ! is_string($tokenEstendido) || $tokenEstendido === '') {
                return $this->falha($request, 'Não foi possível estender a autorização do Facebook. Confira a configuração do login e tente novamente.');
            }

            $tokenUtilizador = $tokenEstendido;

            $respostaPaginas = Http::connectTimeout(5)->timeout(20)->withToken($tokenUtilizador)
                ->get($baseApi.'/me/accounts', [
                    'fields' => 'id,name,access_token',
                ]);

            $paginasRecebidas = $respostaPaginas->json('data', []);
            $paginas = collect(is_array($paginasRecebidas) ? $paginasRecebidas : [])
                ->filter(fn (mixed $pagina): bool => is_array($pagina)
                    && is_string($pagina['id'] ?? null)
                    && is_string($pagina['access_token'] ?? null)
                    && $pagina['access_token'] !== '')
                ->map(fn (array $pagina): array => [
                    'id' => $pagina['id'],
                    'name' => is_string($pagina['name'] ?? null) ? $pagina['name'] : 'Página sem nome',
                    'access_token' => $pagina['access_token'],
                ])->values();

            if (! $respostaPaginas->successful() || $paginas->isEmpty()) {
                return $this->falha($request, 'Nenhuma Página do Facebook com acesso disponível foi encontrada para esta autorização.');
            }
        } catch (Throwable) {
            return $this->falha($request, 'Não foi possível comunicar com o Facebook agora. Tente conectar novamente em alguns instantes.');
        }

        $nonce = Str::random(48);
        $chaveCache = $this->chavePaginas((int) $request->user()->id, $nonce);
        Cache::put(
            $chaveCache,
            Crypt::encryptString(json_encode($paginas->all(), JSON_THROW_ON_ERROR)),
            now()->addMinutes(10)
        );
        $request->session()->put('messenger_oauth_paginas', $nonce);

        return redirect()->route('messenger.oauth.paginas');
    }

    /**
     * Exibe nomes e IDs das Páginas sem expor os respectivos tokens.
     */
    public function paginas(Request $request): Response|RedirectResponse
    {
        $paginas = $this->paginasEmCache($request);
        if ($paginas === null) {
            return $this->falha($request, 'A lista de Páginas expirou. Conecte o Facebook novamente.');
        }

        return Inertia::render('V2/SelecionarPagina', [
            'paginas' => collect($paginas)->map(fn (array $pagina): array => [
                'id' => $pagina['id'],
                'nome' => $pagina['name'],
            ])->values(),
        ]);
    }

    /**
     * Inscreve a Página no webhook e salva o token criptografado na conta.
     */
    public function selecionarPagina(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'page_id' => ['required', 'string', 'max:64'],
        ]);

        $paginas = $this->paginasEmCache($request);
        if ($paginas === null) {
            return $this->falha($request, 'A lista de Páginas expirou. Conecte o Facebook novamente.');
        }

        $pagina = collect($paginas)->first(fn (array $candidata): bool => $candidata['id'] === $dados['page_id']);
        if ($pagina === null) {
            throw ValidationException::withMessages([
                'page_id' => 'Selecione uma Página que apareceu na autorização do Facebook.',
            ]);
        }

        $conta = $request->user()->account;
        if ($conta === null) {
            return $this->falha($request, 'O usuário não está associado a uma conta FlowChat.');
        }

        $jaConectada = MessengerIntegration::query()
            ->where('page_id', $pagina['id'])
            ->where('account_id', '!=', $conta->id)
            ->exists();
        if ($jaConectada) {
            throw ValidationException::withMessages([
                'page_id' => 'Esta Página já está conectada a outra conta FlowChat.',
            ]);
        }

        try {
            $respostaWebhook = Http::connectTimeout(5)->timeout(15)->asForm()->withToken($pagina['access_token'])
                ->post(config('services.messenger.api_url').'/'.$pagina['id'].'/subscribed_apps', [
                    // `messaging_postbacks` e `messaging_referrals` trazem o
                    // referral de anúncios (ads_context_data) ao webhook.
                    'subscribed_fields' => 'messages,messaging_postbacks,messaging_referrals',
                ]);
        } catch (Throwable) {
            return redirect()->route('messenger.oauth.paginas')->withErrors([
                'page_id' => 'Não foi possível comunicar com o Facebook para ativar o webhook. Tente novamente.',
            ]);
        }

        if (! $respostaWebhook->successful() || $respostaWebhook->json('success') !== true) {
            return redirect()->route('messenger.oauth.paginas')->withErrors([
                'page_id' => 'O Facebook autorizou a Página, mas não permitiu ativar o webhook. Confira as permissões de gerenciamento da Página e tente novamente.',
            ]);
        }

        $integracaoAnterior = $conta->messengerIntegration;
        $conta->messengerIntegration()->updateOrCreate([], [
            'page_id' => $pagina['id'],
            'page_access_token' => $pagina['access_token'],
        ]);

        $remocaoAnteriorConfirmada = true;
        if ($integracaoAnterior !== null && $integracaoAnterior->page_id !== $pagina['id']) {
            try {
                $respostaAnterior = Http::connectTimeout(5)->timeout(15)
                    ->withToken($integracaoAnterior->page_access_token)
                    ->delete(config('services.messenger.api_url').'/'.$integracaoAnterior->page_id.'/subscribed_apps');
                $remocaoAnteriorConfirmada = $respostaAnterior->successful();
            } catch (Throwable) {
                $remocaoAnteriorConfirmada = false;
            }
        }

        $this->limparPaginasEmCache($request);

        $mensagem = 'Página '.$pagina['name'].' conectada ao Messenger.';
        if (! $remocaoAnteriorConfirmada) {
            $mensagem .= ' A Meta não confirmou a remoção da assinatura da Página anterior.';
        }

        return redirect()->route('configuracoes.index')->with('mensagem', $mensagem);
    }

    /**
     * Descarta uma seleção OAuth pendente sem alterar a integração existente.
     */
    public function cancelar(Request $request): RedirectResponse
    {
        $this->limparPaginasEmCache($request);

        return redirect()->route('configuracoes.index');
    }

    /**
     * Remove a inscrição da Página e apaga a credencial local.
     */
    public function desconectar(Request $request): RedirectResponse
    {
        $integracao = $request->user()->account?->messengerIntegration;
        if ($integracao === null) {
            return redirect()->route('configuracoes.index');
        }

        try {
            $resposta = Http::connectTimeout(5)->timeout(15)->withToken($integracao->page_access_token)
                ->delete(config('services.messenger.api_url').'/'.$integracao->page_id.'/subscribed_apps');
            $remocaoConfirmada = $resposta->successful();
        } catch (Throwable) {
            $remocaoConfirmada = false;
        }

        $integracao->delete();

        $mensagem = $remocaoConfirmada
            ? 'Página desconectada do FlowChat.'
            : 'A Página foi removida do FlowChat, mas a Meta não confirmou a remoção da assinatura do webhook.';

        return redirect()->route('configuracoes.index')->with('mensagem', $mensagem);
    }

    /**
     * Recupera e descriptografa temporariamente a seleção de Páginas.
     *
     * @return array<int, array{id: string, name: string, access_token: string}>|null
     */
    private function paginasEmCache(Request $request): ?array
    {
        $nonce = $request->session()->get('messenger_oauth_paginas');
        if (! is_string($nonce) || $nonce === '') {
            return null;
        }

        $conteudo = Cache::get($this->chavePaginas((int) $request->user()->id, $nonce));
        if (! is_string($conteudo)) {
            return null;
        }

        try {
            $paginas = json_decode(Crypt::decryptString($conteudo), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return is_array($paginas) ? $paginas : null;
    }

    private function limparPaginasEmCache(Request $request): void
    {
        $nonce = $request->session()->pull('messenger_oauth_paginas');
        if (is_string($nonce) && $nonce !== '') {
            Cache::forget($this->chavePaginas((int) $request->user()->id, $nonce));
        }
    }

    private function chavePaginas(int $userId, string $nonce): string
    {
        return 'messenger:oauth:paginas:'.$userId.':'.$nonce;
    }

    private function falha(Request $request, string $mensagem): RedirectResponse
    {
        $this->limparPaginasEmCache($request);
        $request->session()->forget('messenger_oauth_state');

        return redirect()->route('configuracoes.index')->withErrors(['messenger' => $mensagem]);
    }
}
