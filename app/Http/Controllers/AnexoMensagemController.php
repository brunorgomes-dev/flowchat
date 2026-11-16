<?php

namespace App\Http\Controllers;

use App\Models\Mensagem;
use App\Support\ArmazenamentoMidia;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AnexoMensagemController extends Controller
{
    /**
     * Entrega o arquivo de uma mensagem somente para a conta proprietária.
     */
    public function __invoke(
        Request $request,
        int $mensagem,
        ArmazenamentoMidia $armazenamento,
    ): BinaryFileResponse {
        $mensagemModel = Mensagem::query()
            ->whereKey($mensagem)
            ->whereHas('contato', fn ($consulta) => $consulta
                ->where('account_id', $request->user()->account_id))
            ->firstOrFail();

        abort_unless(
            is_string($mensagemModel->anexo_caminho)
            && $mensagemModel->anexo_caminho !== ''
            && $armazenamento->existe($mensagemModel->anexo_caminho),
            404
        );

        return $armazenamento->resposta(
            $mensagemModel->anexo_caminho,
            $mensagemModel->anexo_nome_original,
            $mensagemModel->anexo_mime,
            $request->boolean('download'),
        );
    }
}
