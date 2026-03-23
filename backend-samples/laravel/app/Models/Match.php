<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Match extends Model
{
    use HasFactory;

    protected $fillable = ['round', 'court_id', 'player_ids', 'result', 'played_at'];

    protected $casts = [
        'player_ids' => 'array',
    ];
}
