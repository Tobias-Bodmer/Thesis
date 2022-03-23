///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        SPAWN,
        TRANSFORM
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let posUpdate: ƒ.Vector3;

    let portHost = <HTMLInputElement>document.getElementById("PortHost");
    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    let PortConnection = <HTMLInputElement>document.getElementById("PortConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);

    function hostServer() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, value: Game.player.hero } })
        Game.connected = true;
    }

    function conneting() {
        client = new ƒClient();
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer(IPConnection.value + PortConnection.value);

        console.log(+IPConnection.value)
        console.log(IPConnection.value + PortConnection.value);
    }

    async function receiveMessage(_event: CustomEvent | MessageEvent | Event): Promise<void> {
        if (_event instanceof MessageEvent) {
            let message: FudgeNet.Message = JSON.parse(_event.data);
            if (message.idSource != client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        console.log(message.content.value);
                        Game.player2 = new Player.Player("player2", message.idSource.toString(), new Player.Character("Thorian", new Player.Attributes(100, 10, 5)));
                        Game.player2.mtxLocal.translation = Game.player2.position;
                        Game.graph.appendChild(Game.player2);
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                        let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2])
                        Game.player2.move(moveVector);
                        // console.log(Game.player2.cmpTransform.mtxLocal.translation);
                    }
                }
            }
        }
    }
    /**
     * sends transform over network
     * @param __position current position of Object
     */
    export function updatePosition(_position: ƒ.Vector3) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position } })
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: do we need to close connections?
    }
}