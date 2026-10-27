<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use Inertia\Inertia;
use Inertia\Response;

class HistoricoContatoController extends Controller
{
    /**
     * Histórico de mensagens do contato, em ordem cronológica.
     */
    public function __invoke(Contato $contato): Response
    {
        return Inertia::render('HistoricoContato', [
            'contato' => $contato,
            'mensagens' => $contato->mensagens()->orderBy('id')->get(),
        ]);
    }
}
