<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Court;
use App\Models\Player;

class CourtController extends Controller
{
    public function index()
    {
        $courts = Court::orderBy('id')->get();
        $courts = $courts->map(function($court) {
            $playerObjs = [];
            if (is_array($court->current_players) && count($court->current_players) > 0) {
                $playerObjs = Player::whereIn('id', $court->current_players)->get();
            }
            $courtArr = $court->toArray();
            $courtArr['players'] = $playerObjs;
            return $courtArr;
        });
        return response()->json(['courts' => $courts]);
    }

    public function finish(Request $request, $id)
    {
        $court = Court::findOrFail($id);
        // If payload contains player_ids and round, create match via MatchController or service
        // For now just free the court and return success
        $court->update(['status' => 'available', 'current_players' => null, 'finished' => true]);
        return response()->json(['success' => true]);
    }

    public function rollback(Request $request, $id)
    {
        $court = Court::findOrFail($id);
        $rolled = $court->current_players ?? [];
        // application-specific: decrement matches for rolled players or handle accordingly
        return response()->json(['success' => true, 'rolledGroup' => $rolled]);
    }
}
