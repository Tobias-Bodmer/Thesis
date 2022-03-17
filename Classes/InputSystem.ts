namespace InputSystem {

    Game.canvas.addEventListener("keypress", move);
    Game.canvas.addEventListener("mousedown", attack);

    function move(_e: KeyboardEvent) {

        let key: string = _e.code.toUpperCase();
        let moveVector: Game.ƒ.Vector2 = new Game.ƒ.Vector2();

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

        // player.move
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