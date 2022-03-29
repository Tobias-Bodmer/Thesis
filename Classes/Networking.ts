///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        SPAWN,
        TRANSFORM,
        BULLET
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let posUpdate: ƒ.Vector3;

    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);

    function hostServer() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, value: Game.player.hero, position: Game.player.cmpTransform.mtxLocal.translation } })
        Game.connected = true;
        ƒ.Debug.log("Connected to Server");
    }

    function conneting() {
        client = new ƒClient();
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer(IPConnection.value);
    }

    async function receiveMessage(_event: CustomEvent | MessageEvent | Event): Promise<void> {
        if (_event instanceof MessageEvent) {
            let message: FudgeNet.Message = JSON.parse(_event.data);
            if (message.idSource != client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        console.log(message.content.value);
                        Game.player2 = new Player.Player("player2", message.idSource.toString(), new Player.Character("Thorian", new Player.Attributes(100, 10, 5)));
                        Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                        Game.graph.appendChild(Game.player2);
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                        let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2])
                        let rotateVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2])
                        Game.player2.mtxLocal.translation = moveVector;
                        Game.player2.mtxLocal.rotation = rotateVector;
                        // console.log(moveVector + " " + rotateVector);
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.BULLET.toString()) {
                        Game.player2.attack(new Game.ƒ.Vector3(message.content.direction.data[0],message.content.direction.data[1],message.content.direction.data[2]))
                    }
                }
            }
        }
    }
    /**
     * sends transform over network
     * @param __position current position of Object
     */
    export function updatePosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } })
    }

    export function updateBullet(_direction: ƒ.Vector3) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.BULLET, direction: _direction } })
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: Things we do after the player left the game
    }
}