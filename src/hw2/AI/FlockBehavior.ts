import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export default class FlockBehavior {
    // The actor who is behaving and their flock
    actor: AnimatedSprite;
    flock: Array<AnimatedSprite>;

    // The region visible to this ship
    visibleRegion: AABB;

    // The radius where a flock member is repelled by flockmates
    avoidRadius: number;

    // Whether or not this flock member has any neighbors
    hasNeighbors: boolean;

    // The center of mass of the flock
    flockCenter: Vec2;

    // The average direction of the flock
    flockHeading: Vec2;

    // The direction this flock member wants to go to avoid flockmates
    separationHeading: Vec2;

    constructor(actor: AnimatedSprite, flock: Array<AnimatedSprite>, visionRange: number, avoidRadius: number) {
        this.actor = actor;
        this.flock = flock;

        // Set up the visible region
        this.visibleRegion = new AABB(this.actor.position.clone(), new Vec2(visionRange, visionRange));
        this.avoidRadius = avoidRadius;
    }

    update(player: AnimatedSprite): void {
        // Update the visible region
        this.visibleRegion.center.copy(this.actor.position);

        // Query for neighbors in the visible region
        let neighbors = this.actor.getScene().getSceneGraph().getNodesInRegion(this.visibleRegion);

        // Extract the direction of the flock member
        let direction = Vec2.UP.rotateCCW(this.actor.rotation);

        // Get a list of viable neighbors
        neighbors = neighbors.filter(neighbor => {
            return (neighbor instanceof AnimatedSprite)
                && neighbor.visible
                && (neighbor !== this.actor)
                && direction.dot(neighbor.position.clone().sub(this.actor.position).normalize()) > -0.866;
            });

        if(neighbors.length <= 0){
            this.hasNeighbors = false;
            return;
        } else {
            this.hasNeighbors = true;
        }

        let flockCenter = Vec2.ZERO;
        let flockHeading = Vec2.ZERO;
        let separationHeading = Vec2.ZERO;

        let isPlayerIncluded = false;

        // Iterate through the neighbors and get data about our flock
        for(let neighbor of neighbors){
            // Make the player count for 10 ships
            let factor = 1;
            if(neighbor === player){
                factor = 10;
                isPlayerIncluded = true;

            }

            let neighborPos = neighbor.position.clone();
            let neighborDir = Vec2.UP.rotateCCW(neighbor.rotation);

            flockCenter.add(neighborPos.scale(factor));

            flockHeading.add(neighborDir.scale(factor));

            let dist = this.actor.position.distanceSqTo(neighborPos);
            if(dist < this.avoidRadius*this.avoidRadius){
                separationHeading.add(this.actor.position.clone().sub(neighborPos).scale(factor/dist));
            }
        }

        flockCenter.scale(1/(neighbors.length + (isPlayerIncluded ? 9 : 0)));

        // Save the flock data to be accessible to our flock members
        this.flockCenter = flockCenter;
        this.flockHeading = flockHeading;
        this.separationHeading = separationHeading;
    }
}