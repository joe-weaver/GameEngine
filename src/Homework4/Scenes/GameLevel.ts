import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Timer from "../../Wolfie2D/Timing/Timer";
import Color from "../../Wolfie2D/Utils/Color";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import EnemyController from "../Enemies/EnemyController";
import { HW4_Events } from "../hw4_enums";
import PlayerController from "../Player/PlayerController";
import MainMenu from "./MainMenu";

// HOMEWORK 4 - TODO
/**
 * Add in some level music.
 * 
 * You can choose whether to add and play music in the generic GameLevel class,
 * in the MainMenu when leaving, or play separate songs in each of the 2 levels.
 */
export default class GameLevel extends Scene {
    // Every level will have a player, which will be an animated sprite
    protected playerSpawn: Vec2;
    protected player: AnimatedSprite;
    protected respawnTimer: Timer;

    // Labels for the UI
    protected static coinCount: number = 0;
    protected coinCountLabel: Label;
    protected static livesCount: number = 3;
    protected livesCountLabel: Label;

    // Stuff to end the level and go to the next level
    protected levelEndArea: Rect;
    protected nextLevel: new (...args: any) => GameLevel;
    protected levelEndTimer: Timer;
    protected levelEndLabel: Label;
    
    // Screen fade in/out for level start and end
    protected levelTransitionTimer: Timer;
    protected levelTransitionScreen: Rect;

    startScene(): void {
        // Do the game level standard initializations
        this.initLayers();
        this.initViewport();
        this.initPlayer();
        this.subscribeToEvents();
        this.addUI();

        // Initialize the timers
        this.respawnTimer = new Timer(1000, () => {
            if(GameLevel.livesCount === 0){
                this.sceneManager.changeToScene(MainMenu);
            } else {
                this.respawnPlayer();
                this.player.enablePhysics();
                this.player.unfreeze();
            }
        });
        this.levelTransitionTimer = new Timer(500);
        this.levelEndTimer = new Timer(3000, () => {
            // After the level end timer ends, fade to black and then go to the next scene
            this.levelTransitionScreen.tweens.play("fadeIn");
        });

        // Start the black screen fade out
        this.levelTransitionScreen.tweens.play("fadeOut");

        // Initially disable player movement
        Input.disableInput();
    }

    // HOMEWORK 4 - TODO
    /**
     * Provide a proper death animation for the player character.
     * Use tweens to achieve this goal.
     * You are also welcome to edit the spritesheet to make a new animation,
     * however tweens MUST also be used.
     */
    updateScene(deltaT: number){
        // Handle events and update the UI if needed
        while(this.receiver.hasNextEvent()){
            let event = this.receiver.getNextEvent();
            
            switch(event.type){
                case HW4_Events.PLAYER_HIT_COIN:
                    {
                        // Hit a coin
                        let coin;
                        if(event.data.get("node") === this.player.id){
                            // Other is coin, disable
                            coin = this.sceneGraph.getNode(event.data.get("other"));
                        } else {
                            // Node is coin, disable
                            coin = this.sceneGraph.getNode(event.data.get("node"));
                        }
                        
                        // Remove coin
                        coin.destroy();

                        // Increment our number of coins
                        this.incPlayerCoins(1);

                        // Play a coin sound
                        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "coin", loop: false, holdReference: false});
                    }
                    break;

                case HW4_Events.PLAYER_HIT_COIN_BLOCK:
                    {
                        // Hit a coin block, so increment our number of coins
                        this.incPlayerCoins(1);
                        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "coin", loop: false, holdReference: false});
                    }
                    break;

                case HW4_Events.PLAYER_HIT_ENEMY:
                    {
                        let node = this.sceneGraph.getNode(event.data.get("node"));
                        let other = this.sceneGraph.getNode(event.data.get("other"));

                        if(node === this.player){
                            // Node is player, other is enemy
                            this.handlePlayerEnemyCollision(<AnimatedSprite>node, <AnimatedSprite>other);
                        } else {
                            // Other is player, node is enemy
                            this.handlePlayerEnemyCollision(<AnimatedSprite>other,<AnimatedSprite>node);

                        }
                    }
                    break;

                case HW4_Events.ENEMY_DIED:
                    {
                        // An enemy finished its dying animation, destroy it
                        let node = this.sceneGraph.getNode(event.data.get("owner"));
                        node.destroy();
                    }
                    break;
                    
                case HW4_Events.PLAYER_ENTERED_LEVEL_END:
                    {
                        if(!this.levelEndTimer.hasRun() && this.levelEndTimer.isStopped()){
                            // The player has reached the end of the level
                            this.levelEndTimer.start();
                            this.levelEndLabel.tweens.play("slideIn");
                        }
                    }
                    break;

                case HW4_Events.LEVEL_START:
                    {
                        // Re-enable controls
                        Input.enableInput();
                    }
                    break;
                
                case HW4_Events.LEVEL_END:
                    {
                        // Go to the next level
                        if(this.nextLevel){
                            let sceneOptions = {
                                physics: {
                                    groupNames: ["ground", "player", "enemy", "coin"],
                                    collisions:
                                    [
                                        [0, 1, 1, 0],
                                        [1, 0, 0, 1],
                                        [1, 0, 0, 0],
                                        [0, 1, 0, 0]
                                    ]
                                }
                            }
                            this.sceneManager.changeToScene(this.nextLevel, {}, sceneOptions);
                        }
                    }
                    break;

            }
        }

        // If player falls into a pit, kill them off and reset their position
        if(this.player.position.y > 100*64){
            this.incPlayerLife(-1);
            this.respawnPlayer();
        }
    }

    /**
     * Initialzes the layers
     */
    protected initLayers(): void {
        // Add a layer behind the tilemap for coinblock animation
        this.addLayer("coinLayer", 0);

        // Add a layer for UI
        this.addUILayer("UI");

        // Add a layer for players and enemies
        this.addLayer("primary", 1);
    }

    /**
     * Initializes the viewport
     */
    protected initViewport(): void {
        this.viewport.setZoomLevel(2);
    }

    /**
     * Handles all subscriptions to events
     */
    protected subscribeToEvents(){
        this.receiver.subscribe([
            HW4_Events.PLAYER_HIT_COIN,
            HW4_Events.PLAYER_HIT_COIN_BLOCK,
            HW4_Events.PLAYER_HIT_ENEMY,
            HW4_Events.ENEMY_DIED,
            HW4_Events.PLAYER_ENTERED_LEVEL_END,
            HW4_Events.LEVEL_START,
            HW4_Events.LEVEL_END
        ]);
    }

    /**
     * Adds in any necessary UI to the game
     */
    protected addUI(){
        // In-game labels
        this.coinCountLabel = <Label>this.add.uiElement(UIElementType.LABEL, "UI", {position: new Vec2(80, 30), text: "Coins: " + GameLevel.coinCount});
        this.coinCountLabel.textColor = Color.WHITE
        this.coinCountLabel.font = "PixelSimple";
        this.livesCountLabel = <Label>this.add.uiElement(UIElementType.LABEL, "UI", {position: new Vec2(500, 30), text: "Lives: " + GameLevel.livesCount});
        this.livesCountLabel.textColor = Color.WHITE
        this.livesCountLabel.font = "PixelSimple";

        // End of level label (start off screen)
        this.levelEndLabel = <Label>this.add.uiElement(UIElementType.LABEL, "UI", {position: new Vec2(-300, 200), text: "Level Complete"});
        this.levelEndLabel.size.set(1200, 60);
        this.levelEndLabel.borderRadius = 0;
        this.levelEndLabel.backgroundColor = new Color(34, 32, 52);
        this.levelEndLabel.textColor = Color.WHITE;
        this.levelEndLabel.fontSize = 48;
        this.levelEndLabel.font = "PixelSimple";

        // Add a tween to move the label on screen
        this.levelEndLabel.tweens.add("slideIn", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.posX,
                    start: -300,
                    end: 300,
                    ease: EaseFunctionType.OUT_SINE
                }
            ]
        });

        this.levelTransitionScreen = <Rect>this.add.graphic(GraphicType.RECT, "UI", {position: new Vec2(300, 200), size: new Vec2(600, 400)});
        this.levelTransitionScreen.color = new Color(34, 32, 52);
        this.levelTransitionScreen.alpha = 1;

        this.levelTransitionScreen.tweens.add("fadeIn", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 0,
                    end: 1,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: HW4_Events.LEVEL_END
        });

        this.levelTransitionScreen.tweens.add("fadeOut", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 1,
                    end: 0,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: HW4_Events.LEVEL_START
        });
    }

    /**
     * Initializes the player
     */
    protected initPlayer(): void {
        // Add the player
        this.player = this.add.animatedSprite("player", "primary");
        this.player.scale.set(2, 2);
        if(!this.playerSpawn){
            console.warn("Player spawn was never set - setting spawn to (0, 0)");
            this.playerSpawn = Vec2.ZERO;
        }
        this.player.position.copy(this.playerSpawn);
        this.player.addPhysics(new AABB(Vec2.ZERO, new Vec2(14, 14)));
        this.player.colliderOffset.set(0, 2);
        this.player.addAI(PlayerController, {playerType: "platformer", tilemap: "Main"});

        // Add triggers on colliding with coins or coinBlocks
        this.player.setGroup("player");

        // Add a tween animation for the player jump
        this.player.tweens.add("flip", {
            startDelay: 0,
            duration: 500,
            effects: [
                {
                    property: "rotation",
                    start: 0,
                    end: 2*Math.PI,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ]
        });

        this.viewport.follow(this.player);
    }

    /**
     * Initializes the level end area
     */
    protected addLevelEnd(startingTile: Vec2, size: Vec2): void {
        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, "primary", {position: startingTile.add(size.scaled(0.5)).scale(32), size: size.scale(32)});
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.setTrigger("player", HW4_Events.PLAYER_ENTERED_LEVEL_END, null);
        this.levelEndArea.color = new Color(0, 0, 0, 0);
    }

    // HOMEWORK 4 - TODO
    /*
        Make sure enemies are being set up properly to have triggers so that when they collide
        with players, they send out a trigger event.

        Look at the levelEndArea trigger for reference.
    */
    /**
     * Adds an enemy into the game
     * @param spriteKey The key of the enemy sprite
     * @param tilePos The tilemap position to add the enemy to
     * @param aiOptions The options for the enemy AI
     */
    protected addEnemy(spriteKey: string, tilePos: Vec2, aiOptions: Record<string, any>): void {
        let enemy = this.add.animatedSprite(spriteKey, "primary");
        enemy.position.set(tilePos.x*32, tilePos.y*32);
        enemy.scale.set(2, 2);
        enemy.addPhysics();
        enemy.addAI(EnemyController, aiOptions);
        enemy.setGroup("enemy");
    }

    // HOMEWORK 4 - TODO
    /**
     * You must implement this method.
     * There are 3 types of collisions:
     * 
     * 1) Collisions with ghost enemies
     *      Jumping on their head kills them, but walking into them kills the player.
     *      Although it never happens in game, assume that if they fall on the player, it kills them.
     *      You must play the death animation and the ghost death noise you created if the ghost dies
     * 
     * 2) Collisions with helicopter enemies
     *      Jumping into them from underneath kills them, but hitting them in any other way kills the player.
     *      You must play the death animation and the helicopter death noise you created if the helicopter dies.
     * 
     * 3) Collisions with spike enemies
     *      The player always dies
     * 
     * Note that node destruction is handled for you.
     * When an enemy dies, play their death animation (which is defined in their json file) with
     * the proper onEnd event to be handled in updateScene().
     * 
     * Make sure when the player dies to decrease their life and respawn them.
     * 
     * For those who are curious, there is actually a node.destroy() method now!
     * You no longer have to make the nodes invisible and pretend they don't exist.
     * As mentioned above, you don't have to use this yourself, but you can see examples
     * of it in this class.
     * 
     * You can implement this method using whatever math you see fit.
     */
    protected handlePlayerEnemyCollision(player: AnimatedSprite, enemy: AnimatedSprite) {}

    /**
     * Increments the amount of life the player has
     * @param amt The amount to add to the player life
     */
    protected incPlayerLife(amt: number): void {
        GameLevel.livesCount += amt;
        this.livesCountLabel.text = "Lives: " + GameLevel.livesCount;
    }

    /**
     * Increments the number of coins the player has
     * @param amt The amount to add the the number of coins
     */
    protected incPlayerCoins(amt: number): void {
        GameLevel.coinCount += amt;
        this.coinCountLabel.text = "Coins: " + GameLevel.coinCount;
    }

    /**
     * Returns the player to spawn
     */
    protected respawnPlayer(): void {
        this.player.position.copy(this.playerSpawn);
    }
}