import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Debug from "../../Wolfie2D/Debug/Debug";
import GameLevel from "./GameLevel";
import Level2 from "./Level2";

export default class Level1 extends GameLevel {
    
    loadScene(): void {
        // Load resources
        this.load.image("background", "hw4_assets/sprites/2bitbackground.png");
        this.load.image("coin", "hw4_assets/sprites/coin.png");
        this.load.tilemap("level1", "hw4_assets/tilemaps/level1.json");
        this.load.spritesheet("player", "hw4_assets/spritesheets/platformPlayer.json");
        this.load.spritesheet("hopper", "hw4_assets/spritesheets/hopper.json");
        this.load.spritesheet("bunny", "hw4_assets/spritesheets/ghostBunny.json");
        this.load.audio("jump", "hw4_assets/sounds/jump.wav");
        this.load.audio("coin", "hw4_assets/sounds/coin.wav");
        this.load.audio("player_death", "hw4_assets/sounds/player_death.wav");
    }

    // HOMEWORK 4 - TODO
    /**
     * Decide which resource to keep and which to cull.
     * 
     * Check out the resource manager class.
     * 
     * Figure out how to save resources from being unloaded, and save the ones that are needed
     * for level 2.
     * 
     * This will let us cut down on load time for the game (although there is admittedly
     * not a lot of load time for such a small project).
     */
    unloadScene(){
        // Keep resources - this is up to you
    }

    startScene(): void {
        // Add a background layer and set the background image on it
        this.addParallaxLayer("bg", new Vec2(0.25, 0), -100);
        let bg = this.add.sprite("background", "bg");
        bg.scale.set(2, 2);
        bg.position.set(bg.boundary.halfSize.x, 76);

        // Add the level 1 tilemap
        this.add.tilemap("level1", new Vec2(2, 2));
        this.viewport.setBounds(0, 0, 64*32, 20*32);

        this.playerSpawn = new Vec2(5*32, 18*32);

        // Do generic setup for a GameLevel
        super.startScene();

        this.addLevelEnd(new Vec2(58, 17), new Vec2(2, 2));

        this.nextLevel = Level2;

        // Add enemies of various types
        for(let pos of [new Vec2(24, 18)]){
            this.addEnemy("bunny", pos, {});
        }

        for(let pos of [new Vec2(51, 17)]){
            this.addEnemy("hopper", pos, {jumpy: true});
        }
    }

    updateScene(deltaT: number): void {
        super.updateScene(deltaT);

        Debug.log("playerpos", this.player.position.toString());
    }
}