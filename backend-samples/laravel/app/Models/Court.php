<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Court extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'status', 'current_players', 'finished'];

    protected $casts = [
        'current_players' => 'array',
    ];
}
