<?php

use App\Http\Controllers\PaginaInicialController;
use App\Http\Controllers\WebhookMessengerController;
use Illuminate\Support\Facades\Route;

Route::get('/', PaginaInicialController::class)->name('pagina-inicial');

Route::get('/webhook/messenger', [WebhookMessengerController::class, 'verificar']);
Route::post('/webhook/messenger', [WebhookMessengerController::class, 'receber']);
