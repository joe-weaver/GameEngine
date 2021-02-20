import AI from "../../Wolfie2D/DataTypes/Interfaces/AI";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Emitter from "../../Wolfie2D/Events/Emitter";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import Receiver from "../../Wolfie2D/Events/Receiver";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import MathUtils from "../../Wolfie2D/Utils/MathUtils";
import { Homework2Event, Homework2Animations } from "../HW2_Enums";
import FlockBehavior from "./FlockBehavior";

export default class BoidBehavior implements AI {
    // The owner of this AI
    private owner: AnimatedSprite;

    // The velocity
    private velocity: Vec2;

    // The flock behavior
    private fb: FlockBehavior;

    // Factors that control behavior
    private separationFactor: number;
    private alignmentFactor: number;
    private cohesionFactor: number;

    // Some vars to keep put bounds on the speed of the ships
    static MIN_SPEED: number = 150;
    static START_SPEED: number = 150;
    static MAX_SPEED: number = 250;
    static MAX_STEER_FORCE: number = 200;

    // An event emitter and receiver to hook into the event system
    private receiver: Receiver

    initializeAI(owner: AnimatedSprite, options: Record<string, any>): void {
        this.owner = owner;

        this.velocity = Vec2.ZERO;

        this.fb = options.fb;

        this.separationFactor = options.separationFactor;
        this.alignmentFactor = options.alignmentFactor;
        this.cohesionFactor = options.cohesionFactor;
        
        this.receiver = new Receiver();

        this.receiver.subscribe(Homework2Event.SHIP_DAMAGE);
    }

    activate(options: Record<string, any>): void {}


    handleEvent(event: GameEvent): void {
        // If a ship was damaged, and that ship was us, explode
        if(event.type === Homework2Event.SHIP_DAMAGE && event.data.get("id") === this.owner.id) {
            // Play death animation, send an event on completion
            this.owner.animation.play(Homework2Animations.SHIP_DIE, false, Homework2Event.SHIP_DEAD);
        }
    }

    update(deltaT: number): void {
        while(this.receiver.hasNextEvent()){
            this.handleEvent(this.receiver.getNextEvent());
        }

        // Don't update if we're dead
        if(!this.owner.visible || this.owner.animation.isPlaying(Homework2Animations.SHIP_DIE)) return;

        let direction = Vec2.UP.rotateCCW(this.owner.rotation);

        if(this.velocity.x === 0 && this.velocity.y === 0){
            this.velocity = direction.scaled(BoidBehavior.START_SPEED);
            this.owner.animation.play(Homework2Animations.SHIP_BOOST, true);
        }

        // Only update as boid if it has neighbors
        if(this.fb.hasNeighbors){
            let flockCenter = this.fb.flockCenter;
            let flockHeading = this.fb.flockHeading;
            let separationHeading = this.fb.separationHeading;

            let offsetToFlockmateCenter = flockCenter.sub(this.owner.position);

            let separationForce = this.steerTowards(separationHeading).scale(this.separationFactor);
            let alignmentForce = this.steerTowards(flockHeading).scale(this.alignmentFactor);
            let cohesionForce = this.steerTowards(offsetToFlockmateCenter).scale(this.cohesionFactor);

            let acceleration = Vec2.ZERO;
            acceleration.add(separationForce).add(alignmentForce).add(cohesionForce);
            this.velocity.add(acceleration.scaled(deltaT));
            let speed = this.velocity.mag();
            this.velocity.normalize();
            direction = this.velocity.clone();
            speed = MathUtils.clamp(speed, BoidBehavior.MIN_SPEED, BoidBehavior.MAX_SPEED);
            this.velocity.scale(speed);
        }

        // Update the rotation
        if(this.fb.hasNeighbors){
            this.owner.rotation = -(Math.atan2(direction.y, direction.x) + Math.PI/2);
        }

        // Update the position
        this.owner.position.add(this.velocity.scaled(deltaT));
    }

    steerTowards(vec: Vec2){
        let v = vec.normalize().scale(BoidBehavior.MAX_SPEED).sub(this.velocity);
        return MathUtils.clampMagnitude(v, BoidBehavior.MAX_STEER_FORCE);
    }

}