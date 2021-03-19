import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Debug from "../../Wolfie2D/Debug/Debug";
import GameLevel from "./GameLevel";

export default class Level2 extends GameLevel {
    // HOMEWORK 4 - TODO
    /**
     * Decide which resource to keep and which to cull.
     * 
     * Not all of these loads are needed. Decide which to remove and handle keeping resources in Level1
     */
    loadScene(): void {
        this.load.image("background", "hw4_assets/sprites/2bitbackground.png");
        this.load.image("coin", "hw4_assets/sprites/coin.png");
        this.load.tilemap("level2", "hw4_assets/tilemaps/level2.json");
        this.load.spritesheet("player", "hw4_assets/spritesheets/platformPlayer.json");
        this.load.spritesheet("hopper", "hw4_assets/spritesheets/hopper.json");
        this.load.spritesheet("bunny", "hw4_assets/spritesheets/ghostBunny.json");
        this.load.spritesheet("spikeball", "hw4_Assets/spritesheets/spikeball.json");
        this.load.audio("jump", "hw4_assets/sounds/jump.wav");
        this.load.audio("coin", "hw4_assets/sounds/coin.wav");
        this.load.audio("player_death", "hw4_assets/sounds/player_death.wav");
    }

    startScene(): void {
        // Add a background layer and set the background image on it
        this.addParallaxLayer("bg", new Vec2(0.25, 0), -100);
        let bg = this.add.sprite("background", "bg");
        bg.scale.set(2, 2);
        bg.position.set(bg.boundary.halfSize.x, 96);

        // Add the level 1 tilemap
        this.add.tilemap("level2", new Vec2(2, 2));
        this.viewport.setBounds(0, 0, 64*32, 20*32);

        this.playerSpawn = new Vec2(5*32, 18*32);

        // Do generic setup for a GameLevel
        super.startScene();

        this.addLevelEnd(new Vec2(56, 17), new Vec2(2, 2));

        // Add enemies of various types
        for(let pos of [new Vec2(17, 18)]){
            this.addEnemy("bunny", pos, {});
        }

        // HOMEWORK 4 - TODO
        /*
            You may want to modify this code here to get the spikeball enemy to work properly.
            The exact implementation is up to you though.
        */
        for(let pos of [new Vec2(44, 18), new Vec2(48, 17)]){
            this.addEnemy("spikeball", pos, {});
        }

        for(let pos of [new Vec2(33, 18)]){
            this.addEnemy("hopper", pos, {jumpy: true});
        }
    }

    updateScene(deltaT: number): void {
        super.updateScene(deltaT);

        Debug.log("playerpos", this.player.position.toString());
    }
}