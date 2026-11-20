<?php

namespace App\Actions\Mensagens;

use App\Models\Account;
use App\Models\Contato;
use App\Models\EtapaFluxo;
use App\Models\LogSistema;
use App\Support\ArmazenamentoMidia;
use App\Support\Meta\ResumoErroMeta;
use App\Support\MidiaEtapa;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Envia uma etapa de mídia usando a Attachment Upload API e um
 * attachment_id reutilizável, privado da Página conectada.
 */
final class EnviarMidiaDaEtapa
{
    /**
     * @return array{texto: null, tipo_conteudo: string, anexo_caminho: string, anexo_nome_original: string|null, anexo_mime: string|null, anexo_tamanho_bytes: int|null}|null
     */
    public function executar(
        EtapaFluxo $etapa,
        Account $conta,
        Contato $contato,
        ?string $token,
        string $tipoConteudo,
    ): ?array {
        if (! $token) {
            $this->registrarErroMidia($conta->id, 'Token da Página do Messenger não configurado');

            return null;
        }

        $caminho = (string) $etapa->anexo_caminho;
        if ($caminho === '' || ! Storage::disk(ArmazenamentoMidia::DISCO)->exists($caminho)) {
            $this->registrarErroMidia($conta->id, "Arquivo da etapa {$etapa->ordem} não está disponível no armazenamento privado");

            return null;
        }

        $integracao = $conta->messengerIntegration;
        if ($integracao === null) {
            $this->registrarErroMidia($conta->id, 'Integração do Messenger não configurada para enviar mídia');

            return null;
        }

        $attachmentId = $this->obterAttachmentId($etapa, $integracao->page_id, $token, $tipoConteudo, $conta->id);
        if ($attachmentId === null) {
            return null;
        }

        $resposta = $this->enviarAnexoPorId($token, $contato->psid, $tipoConteudo, $attachmentId);

        // Um attachment_id pode ter sido revogado ou expirado antes do prazo
        // documentado. Nesse caso, reenvia o arquivo original uma única vez.
        if (! $resposta->successful() && $this->erroAnexoInvalido($resposta)) {
            $this->limparAttachmentId($etapa);
            $attachmentId = $this->obterAttachmentId($etapa, $integracao->page_id, $token, $tipoConteudo, $conta->id);

            if ($attachmentId === null) {
                return null;
            }

            $resposta = $this->enviarAnexoPorId($token, $contato->psid, $tipoConteudo, $attachmentId);
        }

        if (! $resposta->successful()) {
            $this->registrarErroMidia(
                $conta->id,
                'Graph API rejeitou o envio de mídia: '.ResumoErroMeta::de($resposta),
            );

            return null;
        }

        return [
            'texto' => null,
            'tipo_conteudo' => $tipoConteudo,
            'anexo_caminho' => $caminho,
            'anexo_nome_original' => $etapa->anexo_nome_original,
            'anexo_mime' => $etapa->anexo_mime,
            'anexo_tamanho_bytes' => $etapa->anexo_tamanho_bytes,
        ];
    }

    /**
     * Reutiliza o attachment_id apenas quando ele pertence à Página atual e
     * ainda tem margem antes da expiração documentada de 90 dias.
     */
    private function obterAttachmentId(
        EtapaFluxo $etapa,
        string $pageId,
        string $token,
        string $tipoConteudo,
        int $accountId,
    ): ?string {
        $attachmentId = $etapa->anexo_attachment_id;
        $expiraEm = $etapa->anexo_attachment_expira_em;

        if (is_string($attachmentId)
            && $attachmentId !== ''
            && $etapa->anexo_attachment_page_id === $pageId
            && $expiraEm !== null
            && $expiraEm->isAfter(now()->addDay())) {
            return $attachmentId;
        }

        $caminho = (string) $etapa->anexo_caminho;
        $stream = Storage::disk(ArmazenamentoMidia::DISCO)->readStream($caminho);

        if (! is_resource($stream)) {
            $this->registrarErroMidia($accountId, "Não foi possível ler o arquivo da etapa {$etapa->ordem}");

            return null;
        }

        try {
            $extensao = pathinfo($caminho, PATHINFO_EXTENSION);
            $nomeEnvio = 'midia'.($extensao !== '' ? '.'.$extensao : '');
            $message = json_encode([
                'attachment' => [
                    'type' => MidiaEtapa::tipoMeta($tipoConteudo),
                    'payload' => ['is_reusable' => true],
                ],
            ]);

            $resposta = Http::withToken($token)
                ->connectTimeout(5)
                ->timeout(45)
                ->attach(
                    'filedata',
                    $stream,
                    $nomeEnvio,
                    ['Content-Type' => $etapa->anexo_mime ?: 'application/octet-stream'],
                )
                ->post(config('services.messenger.api_url').'/'.$pageId.'/message_attachments', [
                    'message' => $message,
                ]);
        } catch (Throwable) {
            $this->registrarErroMidia($accountId, 'Falha de comunicação ao enviar o arquivo à Meta');

            return null;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! $resposta->successful()) {
            $this->registrarErroMidia(
                $accountId,
                'Graph API rejeitou o upload do arquivo: '.ResumoErroMeta::de($resposta),
            );

            return null;
        }

        $attachmentId = $resposta->json('attachment_id');
        if (! is_string($attachmentId) || $attachmentId === '') {
            $this->registrarErroMidia($accountId, 'A Meta não devolveu um attachment_id válido para o arquivo');

            return null;
        }

        $etapa->update([
            'anexo_attachment_id' => $attachmentId,
            'anexo_attachment_page_id' => $pageId,
            'anexo_attachment_expira_em' => now()->addDays(90),
        ]);

        return $attachmentId;
    }

    private function enviarAnexoPorId(string $token, string $psid, string $tipoConteudo, string $attachmentId): Response
    {
        return Http::withToken($token)
            ->connectTimeout(5)
            ->timeout(15)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'message' => [
                    'attachment' => [
                        'type' => MidiaEtapa::tipoMeta($tipoConteudo),
                        'payload' => ['attachment_id' => $attachmentId],
                    ],
                ],
            ]);
    }

    private function limparAttachmentId(EtapaFluxo $etapa): void
    {
        $etapa->update([
            'anexo_attachment_id' => null,
            'anexo_attachment_page_id' => null,
            'anexo_attachment_expira_em' => null,
        ]);
    }

    private function erroAnexoInvalido(Response $resposta): bool
    {
        $subcodigo = (int) ($resposta->json('error.error_subcode') ?? 0);

        return in_array($subcodigo, [2018074, 2018008], true);
    }

    private function registrarErroMidia(int $accountId, string $descricao): void
    {
        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_envio_midia',
            'descricao' => $descricao,
        ]);
    }
}
