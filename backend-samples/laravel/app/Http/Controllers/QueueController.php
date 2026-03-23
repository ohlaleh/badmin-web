<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\MatchmakerService;

class QueueController extends Controller
{
    protected $maker;

    public function __construct(MatchmakerService $maker)
    {
        $this->maker = $maker;
    }

    public function index()
    {
        $groups = $this->maker->currentQueue();
        return response()->json(['groups' => $groups]);
    }

    public function generate(Request $request)
    {
        $params = $request->only(['rules_strict','cooldown','next_show']);
        $groups = $this->maker->generate($params);
        return response()->json(['groups' => $groups]);
    }

    public function forceFill(Request $request)
    {
        $nextShow = $request->input('next_show', 10);
        $groups = $this->maker->forceFill($nextShow);
        return response()->json(['groups' => $groups]);
    }
}
