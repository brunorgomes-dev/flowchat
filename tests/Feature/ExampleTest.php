<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertRedirect('/login');
    }

    public function test_proxy_https_encaminhado_mantem_a_requisicao_segura(): void
    {
        $this->withHeader('X-Forwarded-Proto', 'https')
            ->get('/login')
            ->assertOk();

        $this->assertSame('https', app('request')->getScheme());
    }
}
