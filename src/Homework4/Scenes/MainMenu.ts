import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import Level1 from "./Level1";

export default class MainMenu extends Scene {

    animatedSprite: AnimatedSprite;

    loadScene(): void {
        // Load the menu song
        this.load.audio("menu", "hw4_assets/music/menu.mp3");
    }

    startScene(): void {
        this.addUILayer("Main");

        // Center the viewport
        let size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);

        // Create a play button
        let playBtn = <Button>this.add.uiElement(UIElementType.BUTTON, "Main", {position: new Vec2(size.x, size.y), text: "Play Game"});
        playBtn.backgroundColor = Color.TRANSPARENT;
        playBtn.borderColor = Color.WHITE;
        playBtn.borderRadius = 0;
        playBtn.setPadding(new Vec2(50, 10));
        playBtn.font = "PixelSimple";

        // When the play button is clicked, go to the next scene
        playBtn.onClick = () => {
            /*
                Init the next scene with physics collisions:

                        ground  player  enemy   coin
                ground    No      --      --     --
                player   Yes      No      --     --
                enemy    Yes      No      No     --
                coin      No     Yes      No     No

                Each layer becomes a number. In this case, 4 bits matter for each

                ground: self - 0001, collisions - 0110
                player: self - 0010, collisions - 1001
                enemy:  self - 0100, collisions - 0001
                coin:   self - 1000, collisions - 0010
            */

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
            this.sceneManager.changeToScene(Level1, {}, sceneOptions);
        }

        // Scene has started, so start playing music
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "menu", loop: true, holdReference: true});
    }

    unloadScene(): void {
        // The scene is being destroyed, so we can stop playing the song
        this.emitter.fireEvent(GameEventType.STOP_SOUND, {key: "menu"});
    }
}

