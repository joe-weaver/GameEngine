import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameNode from "../../Wolfie2D/Nodes/GameNode";
import Graphic from "../../Wolfie2D/Nodes/Graphic";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import RandUtils from "../../Wolfie2D/Utils/RandUtils";
import AsteroidAI from "../AI/AsteroidAI";
import BoidBehavior from "../AI/ShipAI";
import FlockBehavior from "../AI/FlockBehavior";
import { Homework2Animations, Homework2Event, Homework2Names, Homework2Shaders } from "../HW2_Enums";
import SpaceshipPlayerController from "../AI/SpaceshipPlayerController";
import Circle from "../../Wolfie2D/DataTypes/Shapes/Circle";
import GameOver from "./GameOver";

/**
 * In Wolfie2D, custom scenes extend the original scene class.
 * This gives us access to lifecycle methods to control our game.
 */
export default class Homework1_Scene extends Scene {
	// Here we define member variables of our game, and object pools for adding in game objects
	private player: AnimatedSprite;
	private playerDead: boolean = false;
	private playerShield: number = 5;
	private playerinvincible: boolean = false;
	private mineralAmount: number = 4;
	private MIN_SPAWN_DISTANCE: number = 100;
	private numAsteroidsDestroyed: number = 0;

	// Create an object pool for our fleet
	private MAX_FLEET_SIZE = 20;
	private fleetSize: number = 0;
	private fleet: Array<AnimatedSprite> = new Array(this.MAX_FLEET_SIZE);
	private flockControllers: Array<FlockBehavior> = new Array(this.MAX_FLEET_SIZE);

	// Create an object pool for our fleet
	private MAX_NUM_ASTEROIDS = 6;
	private INITIAL_NUM_ASTEROIDS = 1;
	private numAsteroids = 0;
	private asteroids: Array<Graphic> = new Array(this.MAX_NUM_ASTEROIDS);

	// Create an object pool for our fleet
	private MAX_NUM_MINERALS = 20;
	private minerals: Array<Graphic> = new Array(this.MAX_NUM_MINERALS);

	// Labels for the gui
	private mineralsLabel: Label;
	private shieldsLabel: Label;
	private fleetLabel: Label;
	private asteroidsLabel: Label;

	// Timers
	private asteroidTimer: number = 0;
	private ASTEROID_MAX_TIME: number = 5;	// Spawn an asteroid every 10 seconds
	private mineralTimer: number = 0;
	private MINERAL_MAX_TIME: number = 5; // Spawn a mineral every 5 seconds
	private gameEndTimer: number = 0;
	private GAME_END_MAX_TIME: number = 3;

	// Other variables
	private WORLD_PADDING: Vec2 = new Vec2(64, 64);
	private ASTEROID_SPEED: number = 100;
	private ASTEROID_SPEED_INC: number = 10;

	// HOMEWORK 2 - TODO
	/*
		You'll want to be sure to load in your own sprite here
	*/
	/*
	 * loadScene() overrides the parent class method. It allows us to load in custom assets for
	 * use in our scene.
	 */
	loadScene(){
		/* ##### DO NOT MODIFY ##### */
		// Load in the player spaceship spritesheet
		this.load.spritesheet("player", "hw2_assets/spritesheets/player_spaceship.json");

		// Load in the background image
		this.load.image("space", "hw2_assets/sprites/space.png");

		/* ##### YOUR CODE GOES BELOW THIS LINE ##### */
	}

	/*
	 * startScene() allows us to add in the assets we loaded in loadScene() as game objects.
	 * Everything here happens strictly before update
	 */
	startScene(){
		/* ##### DO NOT MODIFY ##### */
		// Create a background layer
		this.addLayer("background", 0);

		// Add in the background image
		let bg = this.add.sprite("space", "background");
		bg.scale.set(2, 2);
		bg.position.copy(this.viewport.getCenter());

		// Create a layer to serve as our main game - Feel free to use this for your own assets
		// It is given a depth of 5 to be above our background
		this.addLayer("primary", 5);

		// Initialize the player
		this.initializePlayer();
		
		// Initialize the UI
		this.initializeUI();

		// Initialize object pools
		this.initializeObjectPools();

		// Spawn some asteroids to start the game
		for(let i = 0; i < this.INITIAL_NUM_ASTEROIDS; i++){
			this.spawnAsteroid();
		}

		// Initialize variables
		AsteroidAI.SPEED = this.ASTEROID_SPEED;

		// Subscribe to events
		this.receiver.subscribe(Homework2Event.PLAYER_I_FRAMES_END);
		this.receiver.subscribe(Homework2Event.PLAYER_DEAD);
		this.receiver.subscribe(Homework2Event.SPAWN_FLEET);
		this.receiver.subscribe(Homework2Event.SHIP_DEAD);
	}

	/*
	 * updateScene() is where the real work is done. This is where any custom behavior goes.
	 */
	updateScene(deltaT: number){
		// Handle events we care about
		this.handleEvents();

		// Update flocks
		for(let fb of this.flockControllers){
			fb.update(this.player);
		}

		this.handleCollisions();

		// Handle timers
		this.handleTimers(deltaT);

		// Get the viewport center and padded size
		const viewportCenter = this.viewport.getCenter().clone();
		const paddedViewportSize = this.viewport.getHalfSize().scaled(2).add(this.WORLD_PADDING.scaled(2));

		// Handle screen wrapping
		this.handleScreenWrap(this.player, viewportCenter, paddedViewportSize);

		for(let ship of this.fleet){
			if(ship.visible){
				this.handleScreenWrap(ship, viewportCenter, paddedViewportSize);
			}
		}

		for(let asteroid of this.asteroids){
			if(asteroid.visible){
				this.handleScreenWrap(asteroid, viewportCenter, paddedViewportSize);
			}
		}
	}

	/* #################### CUSTOM METHODS #################### */

	/* ########## START SCENE METHODS ########## */
	/**
	 * Creates and sets up our player object
	 */
	initializePlayer(): void {
		// Add in the player as an animated sprite
		// We give it the key specified in our load function and the name of the layer
		this.player = this.add.animatedSprite("player", "primary");
		
		// Set the player's position to the middle of the screen, and scale it down
		this.player.position.set(this.viewport.getCenter().x, this.viewport.getCenter().y);
		this.player.scale.set(0.5, 0.5);

		// Play the idle animation by default
		this.player.animation.play("idle");

		// Give the player a smaller hitbox
		let playerCollider = new AABB(Vec2.ZERO, new Vec2(32, 32));
		this.player.setCollisionShape(playerCollider)

		// Add a playerController to the player
		this.player.addAI(SpaceshipPlayerController, {owner: this.player, spawnFleetEventKey: "spawnFleet", initialShield: this.playerShield});
	}

	/**
	 * Creates all of our UI layer components
	 */
	initializeUI(): void {
		// UILayer stuff
		this.addUILayer("ui");

		// Minerals label
		this.mineralsLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(125, 50), text: `Minerals: ${this.mineralAmount}`});
		this.mineralsLabel.size.set(200, 50);
		this.mineralsLabel.setHAlign("left");
		this.mineralsLabel.textColor = Color.WHITE;

		// Shields label
		this.shieldsLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(375, 50), text: `Shield: ${this.playerShield}`});
		this.shieldsLabel.size.set(200, 50);
		this.shieldsLabel.setHAlign("left");
		this.shieldsLabel.textColor = Color.WHITE;

		// Fleet label
		this.fleetLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(625, 50), text: "Fleet Size: 0"});
		this.fleetLabel.size.set(200, 50);
		this.fleetLabel.setHAlign("left");
		this.fleetLabel.textColor = Color.WHITE;

		// Asteroids label
		this.asteroidsLabel = <Label>this.add.uiElement(UIElementType.LABEL, "ui", {position: new Vec2(875, 50), text: "Asteroids: 0"});
		this.asteroidsLabel.size.set(200, 50);
		this.asteroidsLabel.setHAlign("left");
		this.asteroidsLabel.textColor = Color.WHITE;
	}

	/**
	 * Creates object pools for our items.
	 * For more information on object pools, look here:
	 * https://gameprogrammingpatterns.com/object-pool.html
	 */
	initializeObjectPools(): void {
		// Initialize the fleet object pool
		for(let i = 0; i < this.fleet.length; i++){
			this.fleet[i] = this.add.animatedSprite(Homework2Names.FLEET_SHIP, "primary");
			this.fleet[i].animation.play(Homework2Animations.SHIP_IDLE);
			this.fleet[i].scale.set(0.3, 0.3);
			this.fleet[i].visible = false;

			// Initialize flock behaviors
			this.flockControllers[i] = new FlockBehavior(this.fleet[i], this.fleet, 150, 50);

			// Add AI to our ship
			this.fleet[i].addAI(BoidBehavior, {fb: this.flockControllers[i], separationFactor: 3, alignmentFactor: 1, cohesionFactor: 3});

			// Add a collider to our ship
			let collider = new AABB(Vec2.ZERO, new Vec2(32, 32));
			this.fleet[i].setCollisionShape(collider);
		}

		// Initialize the mineral object pool
		for(let i = 0; i < this.minerals.length; i++){
			this.minerals[i] = this.add.graphic(GraphicType.RECT, "primary", {position: new Vec2(0, 0), size: new Vec2(32, 32)});
			this.minerals[i].visible = false;
		}

		// Initialize the asteroid object pool
		for(let i = 0; i < this.asteroids.length; i++){
			this.asteroids[i] = this.add.graphic(GraphicType.RECT, "primary", {position: new Vec2(0, 0), size: new Vec2(100, 100)});
			// Use our custom shader for the asteroids
			this.asteroids[i].useCustomShader(Homework2Shaders.GRADIENT_CIRCLE);

			// Make our asteroids inactive by default
			this.asteroids[i].visible = false;

			// Assign them an asteroid ai
			this.asteroids[i].addAI(AsteroidAI);

			// Give them a collision shape
			let collider = new Circle(Vec2.ZERO, 50);
			this.asteroids[i].setCollisionShape(collider);
		}
	}

	// Spawns a new ship for your fleet
	spawnShip(position: Vec2): void {
		if(this.mineralAmount < 2) return;

		// Find the first viable ship
		let ship: AnimatedSprite = null;

		for(let s of this.fleet){
			if(!s.visible){
				// We found a dead asteroid
				ship = s;
				break;
			}
		}

		if(ship !== null){
			// Spawn a ship
			ship.visible = true;
			ship.position = position;
			ship.setAIActive(true, {});

			this.fleetSize += 1;
			this.mineralAmount -= 2;
			
			// Update GUI
			this.fleetLabel.text = `Fleet: ${this.fleetSize}`;
			this.mineralsLabel.text = `Minerals: ${this.mineralAmount}`;
		}
	}

	// Spawns a new mineral into the world
	spawnMineral(): void {
		// Find the first viable mineral
		let mineral: Graphic = null;

		for(let m of this.minerals){
			if(!m.visible){
				// We found a dead asteroid
				mineral = m;
				break;
			}
		}

		if(mineral !== null){
			// Bring this mineral to life
			mineral.visible = true;

			let viewportSize = this.viewport.getHalfSize().scaled(2);
			// Loop on position until we're clear of the player
			mineral.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);

			while(mineral.position.distanceTo(this.player.position) < this.MIN_SPAWN_DISTANCE){
				mineral.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);
			}
		}
	}

	/* ############################## */

	/* ########## UPDATE SCENE METHODS ########## */
	
	/**
	 * Handles all events we care about in the update cycle.
	 * Gets all events from the receiver this frame, and reacts to them accordingly
	 */
	handleEvents(){
		while(this.receiver.hasNextEvent()){
			let event = this.receiver.getNextEvent();

			if(event.type === Homework2Event.PLAYER_I_FRAMES_END){
				this.playerinvincible = false;
			}

			if(event.type === Homework2Event.PLAYER_DEAD){
				this.playerDead = true;
			}

			if(event.type === Homework2Event.SPAWN_FLEET){
				this.spawnShip(event.data.get("position"));
			}

			if(event.type === Homework2Event.SHIP_DEAD){
				// Fleet member died, hide them
				this.fleetSize -= 1;
				event.data.get("owner").visible = false;
				
				// Update te gui
				this.fleetLabel.text = `Fleet: ${this.fleetSize}`;
			}
		}
	}

	/**
	 * Updates all of our timers and handles timer related functions
	 */
	handleTimers(deltaT: number): void {
		this.asteroidTimer += deltaT;
		this.mineralTimer += deltaT;

		if(this.playerDead) this.gameEndTimer += deltaT;

		if(this.asteroidTimer > this.ASTEROID_MAX_TIME){
			// Spawn an asteroid at a random location (not near the player)
			this.asteroidTimer -= this.ASTEROID_MAX_TIME;
			this.spawnAsteroid();
		}

		if(this.mineralTimer > this.MINERAL_MAX_TIME){
			// Spawn a mineral at a random location (not near the player)
			this.mineralTimer -= this.MINERAL_MAX_TIME;
			this.spawnMineral();
		}

		if(this.gameEndTimer > this.GAME_END_MAX_TIME){
			// End the game
			this.sceneManager.changeScene(GameOver, {score: this.numAsteroidsDestroyed}, {});
		}
	}

	// HOMEWORK 2 - TODO
	/**
	 * Handles all collisions.
	 * Collisions only occur between:
	 * 	-Fleet ships and asteroids
	 *	-The player and asteroids
	 * 	-The player and minerals
	 * 
	 * The collision type is AABB to Circle for collisions with asteroids.
	 * 
	 * Collisions between the player and minerals are already working just fine.
	 * These are AABB to AABB collisions. You can check out the code for that in the AABB class
	 * for some inspiration for your own collision detection.
	 * 
	 * You'll have to implement collision detection for AABBs and Circles. This is in another TODO,
	 * but it is used here.
	 * 
	 * For this TODO, you'll handle the response to when a player collides with an asteroid.
	 * When the player collides with an asteroid, several things must happen:
	 * 
	 *	1) The asteroid must be "destroyed". We control alive/dead status with the "visible" field.
	 *	2) The player must be damaged. This has two parts to it.
	 *		i) The player shield, which is tracked here, must decrease, and the player should become invincible.
	 *		ii) We must send an event to the EventQueue saying that the player has been damaged. You'll have to go 
	 			into the SpaceshipPlayerController class and make sure it is  subscribed to these types of events.
				For event data, we must include the shield level after the player takes damage. This data is
				important for knowing when the player dies. You'll know yours is working if you go to a game over
				screen once you lose all of your health.
		3) The text of the GUI must be updated.
		4) We must increase the player's score, or numAsteroidsDestroyed
	 */
	handleCollisions(){
		/* ########## DO NOT MODIFY THIS CODE ########## */

		// Check for mineral collisions
		for(let mineral of this.minerals){
			if(mineral.visible && this.player.collisionShape.overlaps(mineral.boundary)){
				// A collision happened - destroy the mineral
				mineral.visible = false;

				// Increase the minerals available to the player
				this.mineralAmount += 1;

				// Update the gui
				this.mineralsLabel.text = `Minerals: ${this.mineralAmount}`;
			}
		}

		// Check for collisions of fleet with asteroids
		for(let asteroid of this.asteroids){
			// If the asteroid is spawned
			if(asteroid.visible){
				for(let ship of this.fleet){
					// If the ship is spawned, isn't already dying, and overlaps the asteroid
					if(ship.visible &&
						!ship.animation.isPlaying("explode") && 
						Homework1_Scene.checkAABBtoCircleCollision(<AABB>ship.collisionShape, <Circle>asteroid.collisionShape)
					){
						// Kill asteroid
						asteroid.visible = false;
						this.numAsteroids -= 1;

						// Update the gui
						this.asteroidsLabel.text = `Asteroids: ${this.numAsteroids}`;

						// Send out an event to destroy the ship
						this.emitter.fireEvent(Homework2Event.SHIP_DAMAGE, {id: ship.id});

						// Exit early - we only need to destroy one ship
						break;
					}
				}
			}
		}

		/* ########## #################### ########## */
		/* ########## YOU CAN CHANGE THE CODE BELOW THIS LINE ########## */

		// If the player is not invincible (e.g. they just got hit by an asteroid last frame),
		// check for asteroid collisions
		if(!this.playerinvincible){
			for(let asteroid of this.asteroids){
				// If the asteroid is spawned in and it overlaps the player
				if(asteroid.visible && Homework1_Scene.checkAABBtoCircleCollision(<AABB>this.player.collisionShape, <Circle>asteroid.collisionShape)){
					// Put your code here:

				}
			}
		}
	}

	// HOMEWORK 2 - TODO
	/**
	 * This function spawns a new asteroid from our object pool.
	 * 
	 * What you'll have to do here is make sure the newly spawned asteroid has a random color,
	 * chosen from a selection of your 6 favorite colors.
	 * 
	 * The asteroid has a color field with type Color, a class that can be found in the Utils folder.
	 * Check out that class to see how to create colors and access its fields.
	 */
	spawnAsteroid(): void {
		// Find the first viable asteroid
		let asteroid: Graphic = null;

		for(let a of this.asteroids){
			if(!a.visible){
				// We found a dead asteroid
				asteroid = a;
				break;
			}
		}

		if(asteroid !== null){
			// Bring this asteroid to life
			asteroid.visible = true;

			// Extract the size of the viewport
			let viewportSize = this.viewport.getHalfSize().scaled(2);

			// Loop on position until we're clear of the player
			asteroid.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);
			while(asteroid.position.distanceTo(this.player.position) < this.MIN_SPAWN_DISTANCE){
				asteroid.position = RandUtils.randVec(0, viewportSize.x, 0, viewportSize.y);
			}

			// Assign a random direction
			let dir = Vec2.UP.rotateCCW(Math.random()*Math.PI*2);
			asteroid.setAIActive(true, {direction: dir});
			AsteroidAI.SPEED += this.ASTEROID_SPEED_INC;

			// Update the UI
			this.numAsteroids += 1;
			this.asteroidsLabel.text = `Asteroids: ${this.numAsteroids}`;
		}
	}

	// HOMEWORK 2 - TODO
	/**
	 * This function takes in a GameNode that may be out of bounds of the viewport and
	 * modifies its position so that it wraps around the viewport from one side to the other.
	 * e.g. going to far off screen in the negative x-direction would cause a node to be looped
	 * back to the positive x size.
	 * 
	 * Keep in mind while implementing this that JavaScript's % operator does a remainder operation,
	 * not a modulus operation:
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
	 * 
	 * Also keep in mind that the screenwrap in this case is padded, meaning that a GameNode can go off
	 * the side of the viewport by the padding amount in any direction before it will wrap to the other side.
	 * 
	 * A visualization of the padded viewport is shown below. o's represent valid locations for GameNodes,
	 * X's represent invalid locations.
	 * 
	 * An o with an arrow is drawn to represent how a GameNode wraps around the screen.
	 * Note that it wraps from one side of the padding to the other side, and is therefore not
	 * visible until it reaches the viewport (aka the visible region).
	 * 
	 * 		X				 THIS IS OUT OF BOUNDS
	 * 			 _______________________________________________
	 * 			|	 THIS IS THE PADDED REGION (OFF SCREEN)		|
	 * 			|		 _______________________________		|
	 * 			|	o	|								|		|
	 * 			|		|								|		|
	 *	 		|		|	  THIS IS THE VISIBLE		|		|
	 * 			|		|			 REGION				|		|
	 * 	  <-WRAP|<--o	|								|	o<--|ENDS UP ON THIS SIDE<-
	 * 			|		|		o						|		|
	 * 			|		|_______________________________|		|
	 * 			|												|
	 * 			|_______________________________________________|
	 * 
	 * It may be helpful to make your own drawings while figuring out the math for this part.
	 * 
	 * @param node The node to wrap around the screen
	 * @param viewportCenter The center of the viewport
	 * @param paddedViewportSize The size of the viewport with padding
	 */
	handleScreenWrap(node: GameNode, viewportCenter: Vec2, paddedViewportSize: Vec2): void {
		// Your code goes here:

	}

	// HOMEWORK 2 - TODO
	/**
	 * This method checks whether or not an AABB collision shape and a Circle collision shape
	 * overlap with each other.
	 * 
	 * An AABB is an axis-aligned bounding box, it is a rectangle that will always be aligned to the
	 * x-y grid.
	 * 
	 * You will very likely want to draw out examples of this collision while thinking about how
	 * to write this function, and you will want to test it vigorously. An algorithm that works
	 * only most of the time is not an algorithm. If a player is able to break your game, they
	 * will find a way to do so.
	 * 
	 * You can test this method independently by writing some code in main.ts.
	 * 
	 * Although it talks about AABB collisions exclusively, you may find this resource helpful:
	 * https://noonat.github.io/intersect/
	 * 
	 * There are many ways to solve this problem, so get creative! There is not one single solution
	 * we're looking for. Just make sure it works by thoroughly testing it.
	 * 
	 * @param aabb The AABB collision shape
	 * @param circle The Circle collision shape
	 * @returns True if the two shapes overlap, false if they do not
	 */
	static checkAABBtoCircleCollision(aabb: AABB, circle: Circle): boolean {
		// Your code goes here:
		return false;
	}

}