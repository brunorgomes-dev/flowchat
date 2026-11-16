<?php

namespace App\Support;

use DateTimeZone;

/**
 * Fonte única de identificadores IANA de fuso horário válidos, usada pela
 * validação no backend e pelas listagens das telas de cadastro e configurações.
 * Offsets fixos (ex.: UTC+01:00) não são aceitos como fuso horário.
 */
final class FusosHorarios
{
    /**
     * Lista todos os identificadores IANA válidos em ordem alfabética, com o
     * código do país (ISO 3166-1 alpha-2) quando o identificador está
     * associado a um país na base IANA.
     *
     * @return list<array{id: string, pais: string|null}>
     */
    public static function listar(): array
    {
        $fusos = [];

        foreach (DateTimeZone::listIdentifiers() as $identificador) {
            $fusos[$identificador] = ['id' => $identificador, 'pais' => null];
        }

        // A base IANA não expõe um mapa direto zona -> país; a varredura por
        // código de país cobre todas as combinações de duas letras A-Z
        foreach (range('A', 'Z') as $primeira) {
            foreach (range('A', 'Z') as $segunda) {
                $pais = $primeira.$segunda;

                foreach (DateTimeZone::listIdentifiers(DateTimeZone::PER_COUNTRY, $pais) as $identificador) {
                    if (array_key_exists($identificador, $fusos)) {
                        $fusos[$identificador]['pais'] = $pais;
                    }
                }
            }
        }

        ksort($fusos);

        return array_values($fusos);
    }

    /**
     * Indica se o valor é um identificador IANA válido (a lista vem da base
     * de dados de fusos do PHP, portanto muda de horário de verão são
     * respeitados pelo próprio identificador).
     */
    public static function identificadorValido(?string $identificador): bool
    {
        return $identificador !== null
            && in_array($identificador, DateTimeZone::listIdentifiers(), true);
    }
}
