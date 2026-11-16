<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Regras de mídia das etapas confirmadas na documentação atual da Meta.
 *
 * A Send API aceita anexos dos tipos image, audio, video e file, com limite
 * geral de 25 MB (imagens: 8 MB). O upload direto usa a Attachment Upload API.
 */
class MidiaEtapa
{
    public const TipoTexto = 'texto';

    public const TipoImagem = 'imagem';

    public const TipoAudio = 'audio';

    public const TipoVideo = 'video';

    public const TipoArquivo = 'arquivo';

    /**
     * @var array<string, array{rotulo: string, max_bytes: int, extensoes: array<string, list<string>>}>
     */
    private const CONFIGURACOES = [
        self::TipoImagem => [
            'rotulo' => 'imagem',
            'max_bytes' => 8 * 1024 * 1024,
            'extensoes' => [
                'jpg' => ['image/jpeg'],
                'jpeg' => ['image/jpeg'],
                'png' => ['image/png'],
                'gif' => ['image/gif'],
            ],
        ],
        self::TipoAudio => [
            'rotulo' => 'áudio',
            'max_bytes' => 25 * 1024 * 1024,
            'extensoes' => [
                'mp3' => ['audio/mpeg', 'audio/mp3'],
                'm4a' => ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
                'aac' => ['audio/aac', 'audio/x-aac'],
                'wav' => ['audio/wav', 'audio/x-wav', 'audio/wave'],
                'mp4' => ['audio/mp4'],
            ],
        ],
        self::TipoVideo => [
            'rotulo' => 'vídeo',
            'max_bytes' => 25 * 1024 * 1024,
            'extensoes' => [
                'mp4' => ['video/mp4'],
                'mov' => ['video/quicktime'],
                'avi' => ['video/x-msvideo', 'video/avi'],
                'webm' => ['video/webm'],
                'ogg' => ['video/ogg'],
            ],
        ],
        self::TipoArquivo => [
            'rotulo' => 'arquivo',
            'max_bytes' => 25 * 1024 * 1024,
            'extensoes' => [
                'pdf' => ['application/pdf'],
                'doc' => ['application/msword'],
                'docx' => [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/zip',
                ],
                'xls' => ['application/vnd.ms-excel'],
                'xlsx' => [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/zip',
                ],
                'ppt' => ['application/vnd.ms-powerpoint'],
                'pptx' => [
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'application/zip',
                ],
                'txt' => ['text/plain'],
                'csv' => ['text/csv', 'text/plain', 'application/csv'],
                'zip' => ['application/zip', 'application/x-zip-compressed'],
            ],
        ],
    ];

    /**
     * @return list<string>
     */
    public static function tipos(): array
    {
        return array_keys(self::CONFIGURACOES);
    }

    public static function tipoValido(?string $tipo): bool
    {
        return is_string($tipo) && array_key_exists($tipo, self::CONFIGURACOES);
    }

    public static function ehMidia(?string $tipo): bool
    {
        return self::tipoValido($tipo);
    }

    public static function rotulo(?string $tipo): ?string
    {
        return self::tipoValido($tipo) ? self::CONFIGURACOES[$tipo]['rotulo'] : null;
    }

    /**
     * Converte o tipo interno para o tipo aceito pela Send API.
     */
    public static function tipoMeta(string $tipo): string
    {
        return match ($tipo) {
            self::TipoImagem => 'image',
            self::TipoArquivo => 'file',
            default => $tipo,
        };
    }

    public static function limiteBytes(string $tipo): int
    {
        return self::CONFIGURACOES[$tipo]['max_bytes'] ?? 25 * 1024 * 1024;
    }

    /**
     * @return array{extensao: string, mime: string, nome: string, tamanho: int}
     */
    public static function validarArquivo(UploadedFile $arquivo, string $tipo, string $campo): array
    {
        if (! self::tipoValido($tipo)) {
            throw ValidationException::withMessages([
                $campo => 'Selecione um tipo de mídia válido.',
            ]);
        }

        if (! $arquivo->isValid()) {
            throw ValidationException::withMessages([
                $campo => 'O arquivo não foi recebido corretamente. Selecione-o novamente.',
            ]);
        }

        $configuracao = self::CONFIGURACOES[$tipo];
        $extensao = mb_strtolower($arquivo->getClientOriginalExtension());
        $mime = (string) $arquivo->getMimeType();

        if ($extensao === '' || ! array_key_exists($extensao, $configuracao['extensoes'])) {
            throw ValidationException::withMessages([
                $campo => 'Formato não suportado para '.$configuracao['rotulo'].'. Use '.self::extensoesPermitidas($tipo).'.',
            ]);
        }

        if (! in_array($mime, $configuracao['extensoes'][$extensao], true)) {
            throw ValidationException::withMessages([
                $campo => 'O conteúdo do arquivo não corresponde a uma '.$configuracao['rotulo'].' válida.',
            ]);
        }

        if ($arquivo->getSize() > $configuracao['max_bytes']) {
            $limiteMb = (int) round($configuracao['max_bytes'] / 1024 / 1024);

            throw ValidationException::withMessages([
                $campo => 'O arquivo excede o limite de '.$limiteMb.' MB para '.$configuracao['rotulo'].'.',
            ]);
        }

        return [
            'extensao' => $extensao === 'jpeg' ? 'jpg' : $extensao,
            'mime' => $mime,
            'nome' => mb_substr($arquivo->getClientOriginalName(), 0, 255),
            'tamanho' => $arquivo->getSize(),
        ];
    }

    public static function extensoesPermitidas(string $tipo): string
    {
        $extensoes = array_keys(self::CONFIGURACOES[$tipo]['extensoes'] ?? []);

        return implode(', ', array_map(fn (string $extensao): string => strtoupper($extensao), $extensoes));
    }

    /**
     * A migration de mídia das etapas e mensagens já foi executada?
     */
    public static function disponivel(): bool
    {
        return Schema::hasColumn('etapas_fluxo', 'tipo_conteudo')
            && Schema::hasColumn('etapas_fluxo', 'anexo_caminho')
            && Schema::hasColumn('mensagens', 'tipo_conteudo')
            && Schema::hasColumn('mensagens', 'anexo_caminho');
    }
}
