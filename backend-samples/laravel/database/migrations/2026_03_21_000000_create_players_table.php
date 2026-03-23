<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePlayersTable extends Migration
{
    public function up()
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('matches')->default(0);
            $table->integer('last_played_round')->default(-1);
            $table->string('level', 4)->nullable(); // now store as string: N-, N, S, P
            $table->string('gender')->nullable();
            $table->json('teammates')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('players');
    }
}
