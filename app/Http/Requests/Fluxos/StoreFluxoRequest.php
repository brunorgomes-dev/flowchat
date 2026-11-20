<?php

namespace App\Http\Requests\Fluxos;

use Illuminate\Foundation\Http\FormRequest;

class StoreFluxoRequest extends FormRequest
{
    /**
     * A autorização é da rota (`auth` + `conta.ativa`); a conta vem do usuário.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regras de validação da criação de fluxo, iguais às que estavam no controller.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'ativo' => ['sometimes', 'boolean'],
            'etapas' => ['sometimes', 'array'],
            'etapas.*.id' => ['prohibited'],
            'etapas.*.tipo' => ['sometimes', 'in:mensagem,condicao_horario'],
            'etapas.*.texto' => ['nullable', 'string'],
            'etapas.*.pausa_segundos' => ['required', 'integer', 'min:0'],
            'etapas.*.tipo_conteudo' => ['sometimes', 'in:texto,imagem,audio,video,arquivo'],
            'etapas.*.anexo' => ['nullable', 'file', 'max:25600'],
            'etapas.*.remover_anexo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_ativo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_segundos' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'etapas.*.condicoes' => ['sometimes', 'array'],
            'etapas.*.condicoes.*.inicio' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.fim' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.destino_ordem' => ['required', 'integer', 'min:1'],
            'etapas.*.destino_nao_ordem' => ['nullable', 'integer', 'min:1'],
            'etapas.*.encerra_apos' => ['sometimes', 'boolean'],
            'regras' => ['sometimes', 'array'],
            'horario' => ['sometimes', 'array'],
            'horario.ativo' => ['sometimes', 'boolean'],
            'horario.inicio' => ['nullable', 'date_format:H:i'],
            'horario.fim' => ['nullable', 'date_format:H:i'],
            'horario.fora_horario' => ['nullable', 'in:nao_iniciar,aguardar'],
        ];
    }
}
