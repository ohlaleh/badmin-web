<?php

namespace App\Services;

use App\Models\Player;
use App\Models\Court;

class MatchmakerService
{
    public function currentQueue()
    {
        // read from cache or DB if you store precomputed queue
        return [];
    }

    public function generate($opts = [])
    {
        $rulesStrict = $opts['rules_strict'] ?? true;
        $cooldown = $opts['cooldown'] ?? 1;
        $nextShow = $opts['next_show'] ?? 10;

        $courts = Court::all();
        $busyIds = $courts->flatMap(function($c){ return $c->current_players ?? []; })->all();

        $available = Player::whereNotIn('id', $busyIds)->get()->toArray();

        // TODO: implement fairness scoring, balancing and teammate checks
        $groups = [];
        while (count($available) >= 4 && count($groups) < $nextShow) {
            $group = array_splice($available, 0, 4);
            $groups[] = $group;
        }
        return $groups;
    }

    public function forceFill($nextShow = 10)
    {
        return $this->generate(['rules_strict' => false, 'next_show' => $nextShow]);
    }
}
