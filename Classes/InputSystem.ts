namespace InputSystem {

    document.addEventListener("keypress", move);
    Game.canvas.addEventListener("mousedown", attack);

    function move(_e: KeyboardEvent) {

        let key: string = _e.code.toUpperCase().substring(3);
        let moveVector: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();


        switch (key) {
            case "W":
                moveVector.y += 1;
                break;

            case "A":
                moveVector.x -= 1;
                break;

            case "S":
                moveVector.y -= 1;
                break;

            case "D":
                moveVector.x += 1;
                break;

            default:
                break;
        }

        Game.player.move(moveVector);
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