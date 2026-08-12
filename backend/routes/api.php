<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyzeController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\MediaController;
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
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');
Route::post('/sessions', [SessionController::class, 'store']);
Route::post('/sessions/{id}/complete', [SessionController::class, 'complete']);
Route::post('/sessions/{id}/email', [SessionController::class, 'email']);
Route::post('/analyze', [AnalyzeController::class, 'store']);
Route::post('/staff-alerts', [StaffAlertController::class, 'store']);
Route::get('/results/{token}', [ResultController::class, 'show']);

// Admin panel
Route::post('/admin/login', [AdminController::class, 'login']);
Route::get('/admin/stats', [AdminController::class, 'stats']);
Route::get('/admin/sessions', [AdminController::class, 'sessions']);
Route::delete('/admin/sessions/{id}', [AdminController::class, 'deleteSession']);
Route::get('/admin/emails', [AdminController::class, 'emails']);
Route::get('/admin/colors', [AdminController::class, 'colors']);
Route::post('/admin/colors', [AdminController::class, 'storeColor']);
Route::put('/admin/colors/{id}', [AdminController::class, 'updateColor']);
Route::delete('/admin/colors/{id}', [AdminController::class, 'deleteColor']);
Route::get('/admin/fabrics', [AdminController::class, 'fabrics']);
Route::post('/admin/fabrics', [AdminController::class, 'storeFabric']);
Route::put('/admin/fabrics/{id}', [AdminController::class, 'updateFabric']);
Route::delete('/admin/fabrics/{id}', [AdminController::class, 'deleteFabric']);
Route::get('/admin/designs', [AdminController::class, 'designs']);
Route::get('/admin/categories', [AdminController::class, 'categories']);
Route::post('/admin/designs', [AdminController::class, 'storeDesign']);
Route::put('/admin/designs/{id}', [AdminController::class, 'updateDesign']);
Route::delete('/admin/designs/{id}', [AdminController::class, 'deleteDesign']);
Route::post('/admin/designs/{id}/photos', [AdminController::class, 'uploadDesignPhotos']);
