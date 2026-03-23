<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'matches', 'last_played_round', 'level', 'gender', 'teammates'
    ];

    protected $casts = [
        'teammates' => 'array',
        'level' => 'string', // now store as string: N-, N, S, P
    ];
}
