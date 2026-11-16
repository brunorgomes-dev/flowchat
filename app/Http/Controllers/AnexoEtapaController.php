<?php

namespace App\Http\Controllers;

use App\Models\EtapaFluxo;
use App\Support\ArmazenamentoMidia;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AnexoEtapaController extends Controller
{
    /**
     * Entrega o arquivo privado da etapa somente para a conta proprietária.
     */
    public function __invoke(
        Request $request,
        int $fluxo,
        int $etapa,
        ArmazenamentoMidia $armazenamento,
    ): BinaryFileResponse {
        $etapaModel = EtapaFluxo::query()
            ->whereKey($etapa)
            ->where('fluxo_id', $fluxo)
            ->whereHas('fluxo', fn ($consulta) => $consulta
                ->where('account_id', $request->user()->account_id))
            ->firstOrFail();

        abort_unless(
            is_string($etapaModel->anexo_caminho)
            && $etapaModel->anexo_caminho !== ''
            && $armazenamento->existe($etapaModel->anexo_caminho),
            404
        );

        return $armazenamento->resposta(
            $etapaModel->anexo_caminho,
            $etapaModel->anexo_nome_original,
            $etapaModel->anexo_mime,
            $request->boolean('download'),
        );
    }
}
