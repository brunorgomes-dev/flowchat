<?php

namespace App\Support;

use App\Models\Contato;
use App\Models\OrigemContato;
use Illuminate\Support\Facades\Schema;

/**
 * Normaliza e persiste os dados reais de referência recebidos pelo webhook do
 * Messenger. Nenhum campo é inventado: apenas valores presentes no payload
 * são armazenados. A tabela é verificada para que a aplicação continue
 * funcionando enquanto a migration não for executada.
 */
class RegistradorOrigemContato
{
    /**
     * @param  array<string, mixed>  $referral
     */
    public function registrar(
        Contato $contato,
        array $referral,
        string $evento,
        ?string $mensagemInicial = null,
        bool $contatoCriadoPelaOrigem = false,
    ): ?OrigemContato {
        if (! Schema::hasTable('origens_contato')) {
            return null;
        }

        $contexto = is_array($referral['ads_context_data'] ?? null)
            ? $referral['ads_context_data']
            : [];

        $source = $this->texto($referral['source'] ?? null, 30);
        $adId = $this->texto($referral['ad_id'] ?? null, 64);
        $categoria = $this->categoria($source, $adId);

        $atributos = [
            'account_id' => $contato->account_id,
            'contato_id' => $contato->id,
            'evento' => $evento,
            'categoria' => $categoria,
            'source' => $source,
            'type' => $this->texto($referral['type'] ?? null, 30),
            'referencia' => $this->texto($referral['ref'] ?? null, 255),
            'referer_uri' => $this->texto($referral['referer_uri'] ?? null),
            'ad_id' => $adId,
            'ad_title' => $this->texto($contexto['ad_title'] ?? null, 255),
            'post_id' => $this->texto($contexto['post_id'] ?? null, 64),
            'product_id' => $this->texto($contexto['product_id'] ?? null, 64),
            'flow_id' => $this->texto($contexto['flow_id'] ?? null, 64),
            'photo_url' => $this->texto($contexto['photo_url'] ?? null),
            'video_url' => $this->texto($contexto['video_url'] ?? null),
            'mensagem_inicial' => $this->texto($mensagemInicial),
            'dados_brutos' => $referral,
        ];

        if (Schema::hasColumn('origens_contato', 'associada_em')) {
            $atributos['associada_em'] = null;
        }
        if (Schema::hasColumn('origens_contato', 'contato_criado_pela_origem')) {
            $atributos['contato_criado_pela_origem'] = $contatoCriadoPelaOrigem;
        }

        $origem = OrigemContato::create($atributos);

        return $origem;
    }

    public function categoria(?string $source, ?string $adId): string
    {
        $sourceNormalizado = strtoupper((string) $source);

        if ($adId !== null || $sourceNormalizado === 'ADS') {
            return 'anuncio';
        }

        if ($sourceNormalizado === 'SHORTLINK') {
            return 'link';
        }

        return 'outro';
    }

    private function texto(mixed $valor, ?int $limite = null): ?string
    {
        if (! is_scalar($valor)) {
            return null;
        }

        $texto = trim((string) $valor);

        if ($texto === '') {
            return null;
        }

        return $limite === null ? $texto : mb_substr($texto, 0, $limite);
    }
}
