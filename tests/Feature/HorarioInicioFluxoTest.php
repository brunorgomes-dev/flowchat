<?php

namespace Tests\Feature;

use App\Models\Fluxo;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;

class HorarioInicioFluxoTest extends TestCase
{
    /**
     * Cria um fluxo com a janela de início informada, sem etapas.
     */
    private function fluxoComJanela(string $inicio, string $fim): Fluxo
    {
        $conta = User::factory()->create()->account;

        return $conta->fluxos()->create([
            'nome' => 'Janela de teste',
            'ativo' => true,
            'horario_inicio_ativo' => true,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'fora_horario' => 'nao_iniciar',
        ]);
    }

    public function test_janela_normal_so_permite_iniciar_dentro_do_intervalo(): void
    {
        $fluxo = $this->fluxoComJanela('08:00', '18:00');

        $this->assertFalse($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 07:59:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 08:00:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 12:00:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 18:00:00')));
        $this->assertFalse($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 18:01:00')));
    }

    public function test_janela_que_atravessa_a_meia_noite_continua_aberta_no_dia_seguinte(): void
    {
        $fluxo = $this->fluxoComJanela('22:00', '08:00');

        $this->assertFalse($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 21:59:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 22:00:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 23:59:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-19 00:00:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-19 07:59:00')));
        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-19 08:00:00')));
        $this->assertFalse($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-19 08:01:00')));
    }

    public function test_proximo_inicio_de_janela_noturna_e_no_mesmo_dia(): void
    {
        $fluxo = $this->fluxoComJanela('22:00', '08:00');

        $proximo = $fluxo->proximoInicioPermitido(Carbon::parse('2026-11-18 09:30:00'));

        $this->assertNotNull($proximo);
        $this->assertSame('2026-11-18 22:00:00', $proximo->format('Y-m-d H:i:s'));
    }

    public function test_proximo_inicio_de_janela_normal_apos_o_fim_e_no_dia_seguinte(): void
    {
        $fluxo = $this->fluxoComJanela('10:00', '11:00');

        $proximo = $fluxo->proximoInicioPermitido(Carbon::parse('2026-11-18 12:00:00'));

        $this->assertNotNull($proximo);
        $this->assertSame('2026-11-19 10:00:00', $proximo->format('Y-m-d H:i:s'));
    }

    public function test_fluxo_sem_janela_configurada_sempre_permite_iniciar(): void
    {
        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Sem janela', 'ativo' => true]);

        $this->assertTrue($fluxo->dentroDoHorarioInicio(Carbon::parse('2026-11-18 03:00:00')));
        $this->assertNull($fluxo->proximoInicioPermitido(Carbon::parse('2026-11-18 03:00:00')));
    }
}
