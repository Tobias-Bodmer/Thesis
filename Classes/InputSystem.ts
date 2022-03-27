namespace InputSystem {

    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);

    let controller = new Map<string, boolean>([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);

    function keyboardDownEvent(_e: KeyboardEvent) {
        let key: string = _e.code.toUpperCase().substring(3);
        controller.set(key, true);
    }

    function keyboardUpEvent(_e: KeyboardEvent) {
        let key: string = _e.code.toUpperCase().substring(3);
        controller.set(key, false);
    }


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

                break;
            case 2:
                //TODO: right mouse button player.charge or something like that

                break;
            default:

                break;
        }
    }

}