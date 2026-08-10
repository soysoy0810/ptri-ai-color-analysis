<?php

use App\Http\Controllers\Api\AnalyzeController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StaffAlertController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'ok' => true,
        'data' => [
            'service' => 'ptri-laravel-api',
            'version' => '2.0.0',
            'db' => config('database.default'),
            'ai_service_url' => config('services.ai.url'),
        ],
    ]);
});

Route::get('/catalog', [CatalogController::class, 'index']);
Route::post('/sessions', [SessionController::class, 'store']);
Route::post('/sessions/{id}/complete', [SessionController::class, 'complete']);
Route::post('/sessions/{id}/email', [SessionController::class, 'email']);
Route::post('/analyze', [AnalyzeController::class, 'store']);
Route::post('/staff-alerts', [StaffAlertController::class, 'store']);
Route::get('/results/{token}', [ResultController::class, 'show']);
