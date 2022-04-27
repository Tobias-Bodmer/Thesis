namespace InputSystem {

    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);
    Game.canvas.addEventListener("mousemove", rotateToMouse);

    //#region rotate
    let mousePosition: ƒ.Vector3;

    function rotateToMouse(_mouseEvent: MouseEvent): void {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let ray: ƒ.Ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.offsetX, _mouseEvent.offsetY));
            mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
            // Game.avatar1.mtxLocal.rotation = new ƒ.Vector3(0, 0, Calculation.calcDegree(Game.avatar1.mtxLocal.translation, mousePosition));
        }
    }


    export function calcPositionFromDegree(_degrees: number, _distance: number): ƒ.Vector2 {
        let distance = 5;
        let newDeg = (_degrees * Math.PI) / 180;
        let y = Math.cos(newDeg);
        let x = Math.sin(newDeg) * -1;
        let coord = new ƒ.Vector2(x, y);
        coord.scale(distance);
        return coord;
    }
    //#endregion

    //#region move and ability
    let controller = new Map<string, boolean>([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);

    function keyboardDownEvent(_e: KeyboardEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            if (_e.code.toUpperCase() != "SPACE") {
                let key: string = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            } else {
                //Do abilty from player
                ability();
            }
        }
    }

    function keyboardUpEvent(_e: KeyboardEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let key: string = _e.code.toUpperCase().substring(3);
            controller.set(key, false);
        }
    }

    export function move(): Game.ƒ.Vector3 {
        let moveVector: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();

        if (controller.get("W")) {
            moveVector.y += 1;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
        }

        // Game.avatar1.move(moveVector);
        return moveVector;
    }

    function ability() {
        Game.avatar1.doAbility();
    }
    //#endregion

    //#region attack
    function attack(e_: MouseEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let mouseButton = e_.button;
            switch (mouseButton) {
                case 0:
                    //left mouse button player.attack
                    let direction: Game.ƒ.Vector3 = ƒ.Vector3.DIFFERENCE(mousePosition, Game.avatar1.mtxLocal.translation);
                    rotateToMouse(e_);
                    // console.clear();
                    Game.avatar1.attack(direction, null, true);
                    break;
                case 2:
                    //TODO: right mouse button player.heavyAttack or something like that

                    break;
                default:

                    break;
            }
        }
    }
    //#endregion
}