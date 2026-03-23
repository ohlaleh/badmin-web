<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\CourtController;
use App\Http\Controllers\QueueController;

Route::get('/players', [PlayerController::class, 'index']);
Route::post('/players', [PlayerController::class, 'store']);
Route::put('/players/{id}', [PlayerController::class, 'update']);

Route::get('/matches', [MatchController::class, 'index']);
Route::post('/matches', [MatchController::class, 'store']);
Route::patch('/matches/{id}', [MatchController::class, 'update']);
Route::delete('/matches/{id}', [MatchController::class, 'destroy']);

Route::get('/courts', [CourtController::class, 'index']);
Route::post('/courts/{id}/finish', [CourtController::class, 'finish']);
Route::post('/courts/{id}/rollback', [CourtController::class, 'rollback']);

Route::get('/queues', [QueueController::class, 'index']);
Route::post('/queues/generate', [QueueController::class, 'generate']);
Route::post('/queues/force-fill', [QueueController::class, 'forceFill']);

// Admin: reset server state (players matches, courts, queues)
Route::post('/reset', [\App\Http\Controllers\ResetController::class, 'reset']);
