<?php

namespace App\Support;

use App\Models\EtapaFluxo;
use App\Models\Mensagem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Armazenamento privado e durável dos arquivos de mídia. O arquivo original
 * permanece em storage/app/private; a Meta recebe apenas uma cópia temporária
 * via Attachment Upload API.
 */
class ArmazenamentoMidia
{
    public const DISCO = 'local';

    public const PREFIXO_ETAPAS = 'flowchat/etapas/';

    public function armazenar(UploadedFile $arquivo, int $accountId, string $extensao): string
    {
        $diretorio = self::PREFIXO_ETAPAS.$accountId;
        $nomeArquivo = Str::uuid()->toString().'.'.$extensao;
        $caminho = $diretorio.'/'.$nomeArquivo;

        if (! Storage::disk(self::DISCO)->putFileAs($diretorio, $arquivo, $nomeArquivo)) {
            throw new RuntimeException('Não foi possível armazenar o arquivo da etapa.');
        }

        return $caminho;
    }

    public function existe(?string $caminho): bool
    {
        return is_string($caminho)
            && $caminho !== ''
            && Storage::disk(self::DISCO)->exists($caminho);
    }

    public function caminhoAbsoluto(string $caminho): string
    {
        return Storage::disk(self::DISCO)->path($caminho);
    }

    public function resposta(string $caminho, ?string $nome, ?string $mime, bool $download = false): BinaryFileResponse
    {
        $absoluto = $this->caminhoAbsoluto($caminho);
        $nome = $nome !== null && $nome !== '' ? $nome : basename($caminho);
        $headers = ['Content-Type' => $mime !== null && $mime !== '' ? $mime : 'application/octet-stream'];

        return $download
            ? response()->download($absoluto, $nome, $headers)
            : response()->file($absoluto, $headers);
    }

    /**
     * @param  iterable<string>  $caminhos
     */
    public function apagarOrfaos(iterable $caminhos): void
    {
        $unicos = [];

        foreach ($caminhos as $caminho) {
            if (is_string($caminho) && $caminho !== '') {
                $unicos[$caminho] = true;
            }
        }

        foreach (array_keys($unicos) as $caminho) {
            $this->apagarSeNaoReferenciado($caminho);
        }
    }

    /**
     * Nunca apaga um caminho que ainda esteja referenciado por uma etapa ou
     * por uma mensagem já enviada.
     */
    public function apagarSeNaoReferenciado(string $caminho): void
    {
        if (! str_starts_with($caminho, self::PREFIXO_ETAPAS)) {
            return;
        }

        if (MidiaEtapa::disponivel()) {
            $referenciadoPorEtapa = EtapaFluxo::query()
                ->where('anexo_caminho', $caminho)
                ->exists();

            $referenciadoPorMensagem = Mensagem::query()
                ->where('anexo_caminho', $caminho)
                ->exists();

            if ($referenciadoPorEtapa || $referenciadoPorMensagem) {
                return;
            }
        }

        Storage::disk(self::DISCO)->delete($caminho);
    }
}
