import AI from "../../Wolfie2D/DataTypes/Interfaces/AI";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Debug from "../../Wolfie2D/Debug/Debug";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import GameNode from "../../Wolfie2D/Nodes/GameNode";
import Graphic from "../../Wolfie2D/Nodes/Graphic";

export default class AsteroidAI implements AI {
    // The owner of this AI
    protected owner: Graphic;

    // The direction of an asteroid
    public direction: Vec2;

    // The speed all asteroids move at
    public static SPEED: number = 10;

    initializeAI(owner: Graphic, options: Record<string, any>): void {
        this.owner = owner;
        this.direction = Vec2.ZERO;
    }

    activate(options: Record<string, any>): void {
        this.direction = options.direction;
    }

    handleEvent(event: GameEvent): void {
        // Do nothing
    }

    update(deltaT: number): void {
        if(this.owner.visible)
            this.owner.position.add(this.direction.scaled(AsteroidAI.SPEED * deltaT));
    }
}