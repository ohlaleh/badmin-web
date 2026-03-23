<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Player;
use App\Models\Court;

class ResetController extends Controller
{
    // POST /api/reset
    public function reset(Request $request)
    {
        // WARNING: This should be protected by auth in production.
        // Reset players' matches and last played round
        Player::query()->update(["matches" => 0, "last_played_round" => -1]);

        // Clear courts: mark finished and remove players
        Court::query()->update(["finished" => true, "current_players" => json_encode([]), "status" => "available"]);

        // Remove all matches
        \App\Models\Match::truncate();
        // If Court has a players relationship stored, truncate or clear it depending on schema
        // For example, if you have a pivot table, you would truncate it here.

        // Optionally return the authoritative state for the frontend
        $players = Player::orderBy('matches', 'asc')->get();
        $courts = Court::all();

        return response()->json([
            'players' => $players,
            'courts' => $courts,
            'newQueue' => [],
            'round' => 0,
        ]);
    }
}
