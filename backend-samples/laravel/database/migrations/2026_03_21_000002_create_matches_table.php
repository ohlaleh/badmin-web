<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMatchesTable extends Migration
{
    public function up()
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->integer('round');
            $table->unsignedBigInteger('court_id');
            $table->json('player_ids');
            $table->text('result')->nullable();
            $table->timestamp('played_at')->nullable();
            $table->timestamps();

            $table->foreign('court_id')->references('id')->on('courts')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('matches');
    }
}
