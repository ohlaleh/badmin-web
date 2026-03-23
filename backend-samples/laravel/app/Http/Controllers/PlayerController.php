
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Player;

class PlayerController extends Controller
{
    public function index(Request $request)
    {
        $players = Player::orderBy('matches', 'asc')->get();
        return response()->json(['players' => $players]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'level' => 'nullable|string',
            'gender' => 'nullable|string',
        ]);

        $player = Player::create(array_merge($data, ['matches' => 0, 'last_played_round' => -1]));
        return response()->json(['player' => $player], 201);
    }

    public function update(Request $request, $id)
    {
        $player = Player::findOrFail($id);
        $data = $request->only(['name','level','matches','last_played_round','gender']);
        $player->update($data);
        return response()->json(['player' => $player]);
    }

    // PATCH /api/players/{id}/play_status
    public function updatePlayStatus(Request $request, $id)
    {
        $player = \App\Models\Player::findOrFail($id);
        $validated = $request->validate([
            'play_status' => 'required|string|in:active,stopped',
        ]);
        $player->play_status = $validated['play_status'];
        $player->save();
        return response()->json(['success' => true, 'player' => $player]);
    }
}
