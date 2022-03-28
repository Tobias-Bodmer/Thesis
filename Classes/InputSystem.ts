namespace InputSystem {

    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);
    Game.canvas.addEventListener("mousemove", rotateToMouse);

    let controller = new Map<string, boolean>([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);

    let mousePosition: ƒ.Vector3;

    function keyboardDownEvent(_e: KeyboardEvent) {
        let key: string = _e.code.toUpperCase().substring(3);
        controller.set(key, true);
    }

    function keyboardUpEvent(_e: KeyboardEvent) {
        let key: string = _e.code.toUpperCase().substring(3);
        controller.set(key, false);
    }

    //#region rotate
    function rotateToMouse(_mouseEvent: MouseEvent): void {
        let ray: ƒ.Ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.clientX, _mouseEvent.clientY));
        mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
        Game.player.mtxLocal.rotation = new ƒ.Vector3(0, 0, calcDegree(Game.player.mtxLocal.translation, mousePosition));
    }

    function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number {
        let xDistance: number = _target.x - _center.x;
        let yDistance: number = _target.y - _center.y;
        let degrees: number = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;

    }
    //#endregion


    export function move() {
        let moveVector: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        let hasChanged: boolean = false;

        if (controller.get("W")) {
            moveVector.y += 1;
            hasChanged = true;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
            hasChanged = true;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
            hasChanged = true;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
            hasChanged = true;
        }



        if (hasChanged && moveVector.magnitude != 0) {
            Game.player.move(Game.ƒ.Vector3.NORMALIZATION(moveVector, 1));
            //update new transform 
            if (Game.connected) {
                Networking.updatePosition(Game.ƒ.Vector3.NORMALIZATION(moveVector, 1));
            }
        }
    }

    function attack(e_: MouseEvent) {

        let mouseButton = e_.button;

        switch (mouseButton) {
            case 0:
                //TODO: left mouse button player.attack
                Game.player.attack(ƒ.Vector3.DIFFERENCE(mousePosition, Game.player.mtxLocal.translation))

                break;
            case 2:
                //TODO: right mouse button player.charge or something like that

                break;
            default:

                break;
        }
    }

}