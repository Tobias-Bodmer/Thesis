///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        CONNECTED,
        SPAWN,
        TRANSFORM,
        BULLET,
        SPAWNENEMY,
        ENEMYTRANSFORM,
        ENEMYDIE
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let clients: string[] = [];
    export let posUpdate: ƒ.Vector3;
    export let someoneIsHost: boolean = false;
    export let enemy: Enemy.Enemy;
    export let currentIDs: number[] = [];

    document.getElementById("Host").addEventListener("click", () => {spawnPlayer()}, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);




    export function conneting() {
        client = new ƒClient();
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer(IPConnection.value);

        addClientID()

        function addClientID() {
            if (client.id != undefined) {
                clients.push(client.id);
            } else {
                setTimeout(addClientID, 300);
            }
        }
    }


    async function receiveMessage(_event: CustomEvent | MessageEvent | Event): Promise<void> {
        if (_event instanceof MessageEvent) {
            let message: FudgeNet.Message = JSON.parse(_event.data);
            if (message.idSource != client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != client.id && clients.find(element => element == message.content.value) == undefined) {
                            clients.push(message.content.value);
                        }
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        console.table(message.content.type);
                        if (message.content.type == Player.Type.MELEE) {
                            Game.player2 = new Player.Melee("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.player2);
                            Game.connected = true;
                        } else if (message.content.type == Player.Type.RANGED) {
                            Game.player2 = new Player.Ranged("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.player2);
                            Game.connected = true;
                        }

                    }

                    if (Game.connected) {
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2])
                            let rotateVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2])

                            Game.player2.mtxLocal.translation = moveVector;
                            Game.player2.mtxLocal.rotation = rotateVector;
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.BULLET.toString()) {
                            Game.player2.attack(new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]))
                        }

                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            Game.graph.addChild(new Enemy.Enemy("normalEnemy", new Player.Character(message.content.enemy.name, new Player.Attributes(message.content.enemy.attributes.healthPoints, message.content.enemy.attributes.attackPoints, message.content.enemy.attributes.speed)), new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.id));
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.id);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.updateCollider();
                            }
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.id);
                            Game.graph.removeChild(enemy);
                            popID(message.content.id);
                        }
                    }
                }
            }
        }
    }

    //#region player
    export function spawnPlayer(_type?: Player.Type) {
        if (client.idHost == undefined) {
            client.becomeHost();
            someoneIsHost = true;
        }

        if (_type == Player.Type.MELEE){
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.MELEE, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } })
        } else if (_type == Player.Type.RANGED) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } })
        } else {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } })
        }
    }
    /**
     * sends transform over network
     * @param __position current position of Object
     * @param _rotation current rotation of Object
     */
    export function updatePosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } })
    }

    export function updateBullet(_direction: ƒ.Vector3) {
        if (Game.connected) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.BULLET, direction: _direction } })
        }
    }
    //#endregion

    //#region  enemy
    export function spawnEnemy(_enemy: Enemy.Enemy, _id: number) {
        if (Game.connected && client.idHost == client.id) {
            // console.log(_enemy.properties);
            // console.log(_id);
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNENEMY, enemy: _enemy.properties, position: _enemy.mtxLocal.translation, id: _id } })
        }
    }

    export function updateEnemyPosition(_position: ƒ.Vector3, _id: number) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, id: _id } })
    }

    export function removeEnemy(_id: number) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYDIE, id: _id } })

    }
    //#endregion

    export function idGenerator(): number {
        let id = Math.floor(Math.random() * 1000);
        if (currentIDs.find(curID => curID == id)) {
            idGenerator();
        }
        else {
            currentIDs.push(id);
        }

        return id;
    }

    export function popID(_id: number) {
        let index: number;
        for (let i = 0; i < currentIDs.length; i++) {
            if (currentIDs[i] == _id) {
                index = i;
                break;
            }
        }
        // console.log("id to pop: " + _id);
        currentIDs.splice(index, 1);
        // console.log("afterIDs: " + currentIDs);
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: Things we do after the player left the game
    }
}