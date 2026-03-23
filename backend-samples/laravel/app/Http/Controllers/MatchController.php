<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Match as MatchModel;
use App\Models\Player;
use App\Models\Court;
use App\Services\MatchmakerService;

class MatchController extends Controller
{
    public function index(Request $request)
    {
        $matches = MatchModel::orderBy('played_at', 'desc')->limit(100)->get();
        return response()->json(['matches' => $matches]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'round' => 'required|integer',
            'court_id' => 'required|integer|exists:courts,id',
            'player_ids' => 'required|array|size:4',
            'player_ids.*' => 'integer|exists:players,id',
            'result' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        try {
            $match = null;
            DB::transaction(function() use ($data, &$match) {
                $match = MatchModel::create([
                    'round' => $data['round'],
                    'court_id' => $data['court_id'],
                    'player_ids' => $data['player_ids'],
                    'result' => 'playing',
                    'played_at' => now()
                ]);

                // update players
                Player::whereIn('id', $data['player_ids'])->increment('matches');
                Player::whereIn('id', $data['player_ids'])->update(['last_played_round' => $data['round']]);

                // mark court as occupied (not available)
                Court::where('id', $data['court_id'])->update([
                    'status' => 'occupied',
                    'current_players' => $data['player_ids'],
                    'finished' => false
                ]);
            });

            // generate/refill next queue (use matchmaker service)
            $maker = new MatchmakerService();
            $groups = $maker->generate(['rules_strict' => true, 'cooldown' => 1, 'next_show' => 10]);

            return response()->json(['match' => $match, 'newQueue' => $groups], 201);
        } catch (\Throwable $e) {
            \Log::error('Match store error: '.$e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Server error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /api/matches/{id} - complete or update a provisional match
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'round' => 'required|integer',
            'court_id' => 'required|integer|exists:courts,id',
            'player_ids' => 'required|array|size:4',
            'player_ids.*' => 'integer|exists:players,id',
            'result' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'The given data was invalid.', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        try {
            $match = MatchModel::findOrFail($id);

            DB::transaction(function() use ($match, $data) {
                $match->update([
                    'round' => $data['round'],
                    'court_id' => $data['court_id'],
                    'player_ids' => $data['player_ids'],
                    'result' => 'finished',
                    'played_at' => now()
                ]);

                Player::whereIn('id', $data['player_ids'])->update(['last_played_round' => $data['round']]);
                // Only update last_played_round; do NOT increment matches again on finish

                // mark court finished and clear current_players (empty array for consistency)
                Court::where('id', $data['court_id'])->update([
                    'status' => 'available',
                    'current_players' => [],
                    'finished' => true
                ]);
            });

            // return authoritative state
            $maker = new MatchmakerService();
            $groups = $maker->generate(['rules_strict' => true, 'cooldown' => 1, 'next_show' => 10]);

            return response()->json(['match' => $match, 'newQueue' => $groups, 'players' => Player::all()], 200);
        } catch (\Throwable $e) {
            \Log::error('Match update error: '.$e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Server error', 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /api/matches/{id} - cancel a provisional match
    public function destroy($id)
    {
        try {
            $match = MatchModel::findOrFail($id);

            DB::transaction(function() use ($match) {
                // revert players' increments if applicable
                $pids = $match->player_ids ?? [];
                if (is_array($pids) && count($pids) > 0) {
                    Player::whereIn('id', $pids)->decrement('matches');
                    Player::whereIn('id', $pids)->update(['last_played_round' => -1]);
                }

                // free court
                Court::where('id', $match->court_id)->update(['status' => 'available', 'current_players' => null, 'finished' => true]);

                $match->delete();
            });

            $maker = new MatchmakerService();
            $groups = $maker->generate(['rules_strict' => true, 'cooldown' => 1, 'next_show' => 10]);

            return response()->json(['message' => 'Match cancelled', 'newQueue' => $groups, 'players' => Player::all()], 200);
        } catch (\Throwable $e) {
            \Log::error('Match destroy error: '.$e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Server error', 'message' => $e->getMessage()], 500);
        }
    }
}
