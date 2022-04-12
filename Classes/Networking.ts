///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        CONNECTED,
        HOST,
        SETREADY,
        SPAWN,
        TRANSFORM,
        SPAWNBULLET,
        SPAWNBULLETENEMY,
        BULLETTRANSFORM,
        BULLETDIE,
        SPAWNENEMY,
        ENEMYTRANSFORM,
        ENEMYSTATE,
        ENEMYDIE,
        SPAWNITEM,
        UPDATEATTRIBUTES,
        ITEMDIE,
        SENDROOM,
        SWITCHROOMREQUEST
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let clients: Array<{ id: string, ready: boolean }> = [];
    export let posUpdate: ƒ.Vector3;
    export let someoneIsHost: boolean = false;
    export let enemy: Enemy.Enemy;
    export let currentIDs: number[] = [];

    document.getElementById("Host").addEventListener("click", () => { spawnPlayer() }, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);


    export function conneting() {
        client = new ƒClient();
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer(IPConnection.value);

        addClientID()

        function addClientID() {
            if (client.id != undefined) {
                let obj: { id: string, ready: boolean } = { id: client.id, ready: false };
                clients.push(obj);
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
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != client.id && clients.find(element => element == message.content.value) == undefined) {
                            clients.push({ id: message.content.value, ready: false });
                        }
                    }

                    //Set client ready
                    if (message.content != undefined && message.content.text == FUNCTION.SETREADY.toString()) {
                        if (clients.find(element => element.id == message.content.netId) != null) {
                            clients.find(element => element.id == message.content.netId).ready = true;
                        }
                    }

                    //Spawn avatar2 as ranged or melee 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        if (message.content.type == Player.PLAYERTYPE.MELEE) {
                            Game.avatar2 = new Player.Melee("player2", new Player.Character(message.content.value.name,
                                new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));

                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        } else if (message.content.type == Player.PLAYERTYPE.RANGED) {
                            Game.avatar2 = new Player.Ranged("player2", new Player.Character(message.content.value.name,
                                new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));

                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                    }

                    //Runtime updates and communication
                    if (Game.connected) {

                        //Sync avatar2 position and rotation
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2])
                            let rotateVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2])

                            Game.avatar2.mtxLocal.translation = moveVector;
                            Game.avatar2.mtxLocal.rotation = rotateVector;
                        }

                        //Spawn bullet from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                            Game.avatar2.attack(new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]), message.content.netId);
                        }

                        //Spawn bullet from enemy on host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLETENEMY.toString()) {
                            let enemy: Enemy.Enemy = Game.enemies.find(elem => elem.netId == message.content.enemyNetId);
                            if (enemy != null) {
                                if (enemy instanceof Enemy.EnemyShoot && client.id != client.idHost) {
                                    (<Enemy.EnemyShoot>enemy).shoot(message.content.bulletNetId);
                                }
                            }
                        }


                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2])
                                Game.bullets.find(element => element.netId == message.content.netId).hostPositions[message.content.tick] = newPosition;
                            }
                        }

                        //Kill bullet at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                            if (client.id != client.idHost) {
                                let bullet = Game.bullets.find(element => element.netId == message.content.netId);
                                if (bullet != undefined) {
                                    bullet.lifetime = 0;
                                }
                            }
                        }

                        //Spawn enemy at the client 
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            chooseEnemy(<Enemy.ENEMYNAME>message.content.id,
                                new Player.Attributes(message.content.properties.attributes.healthPoints,
                                    message.content.properties.attributes.attackPoints,
                                    message.content.properties.attributes.speed),
                                new ƒ.Vector3(message.content.position.data[0],
                                    message.content.position.data[1],
                                    message.content.position.data[2]),
                                <number>message.content.scale,
                                <number>message.content.netId);
                        }

                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.updateCollider();
                            }
                        }
                        //Sync animation state
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYSTATE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                switch (message.content.state) {
                                    case Enemy.ANIMATIONSTATES.IDLE:
                                        enemy.setAnimation(<ƒAid.SpriteSheetAnimation>enemy.animations["idle"]);
                                        enemy.currentAnimation = Enemy.ANIMATIONSTATES.IDLE;
                                        break;
                                    case Enemy.ANIMATIONSTATES.WALK:
                                        enemy.setAnimation(<ƒAid.SpriteSheetAnimation>enemy.animations["walk"]);
                                        enemy.currentAnimation = Enemy.ANIMATIONSTATES.WALK;
                                        break;
                                }
                            }
                        }

                        //Kill enemy at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(enemy);
                            popID(message.content.netId);
                        }

                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNITEM.toString()) {
                            if (client.id != client.idHost) {
                                if (message.content.attributes != null) {
                                    let attributes = new Player.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.coolDownReduction);
                                    Game.graph.addChild(new Items.InternalItem(message.content.name, message.content.description, new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]), attributes, message.content.type, message.content.imgSrc, message.content.lifetime, message.content.netId));
                                }

                                //TODO: external Item
                            }
                        }

                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            let attributes = new Player.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.coolDownReduction);
                            Game.avatar2.properties.attributes.addAttribuesByItem(attributes, message.content.type);
                        }

                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => (<Items.Item>enem).netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                        // send is hostMessage
                        if (message.content != undefined && message.content.text == FUNCTION.HOST.toString()) {
                            someoneIsHost = true;
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let oldObjects: Game.ƒ.Node[] = Game.graph.getChildren().filter(elem => (<any>elem).tag != Tag.TAG.PLAYER);

                            oldObjects.forEach((elem) => {
                                Game.graph.removeChild(elem);
                            });


                            let room: Generation.Room = new Generation.Room(message.content.name, message.content.coordiantes, message.content.exits, message.content.roomType);

                            room.setDoors();

                            Game.graph.addChild(room);
                            Game.graph.appendChild(room.walls[0]);
                            Game.graph.appendChild(room.walls[1]);
                            Game.graph.appendChild(room.walls[2]);
                            Game.graph.appendChild(room.walls[3]);

                            for (let i = 0; i < room.doors.length; i++) {
                                Game.graph.addChild(room.doors[i]);
                            }

                            Game.avatar1.cmpTransform.mtxLocal.translation = room.cmpTransform.mtxLocal.translation;
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            let currentroom = Generation.rooms.find(elem => elem.coordinates[0] == (<[number, number]>message.content.coordiantes)[0] &&
                                elem.coordinates[1] == (<[number, number]>message.content.coordiantes)[1]);

                            Generation.switchRoom(currentroom, message.content.direction);
                        }
                    }
                }
            }
        }
    }


    export function setClientReady() {
        clients.find(element => element.id == client.id).ready = true;
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SETREADY, netId: client.id } });
    }


    //#region player
    export function setHost() {
        if (client.idHost == undefined) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.HOST, id: client.id } });
            if (!someoneIsHost) {
                client.becomeHost();
                someoneIsHost = true;
            }
        } else {
            someoneIsHost = true;
        }
    }
    export async function spawnPlayer(_type?: Player.PLAYERTYPE) {
        if (_type == Player.PLAYERTYPE.MELEE) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.MELEE, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } })
        } else if (_type == Player.PLAYERTYPE.RANGED) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } })
        } else {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } })
        }
    }
    export function setClient() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    export function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } })
    }
    //#endregion




    //#region bullet
    export function spawnBullet(_direction: ƒ.Vector3, _netId: number) {
        if (Game.connected) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNBULLET, direction: _direction, netId: _netId } })
        }
    }
    export function updateBullet(_position: ƒ.Vector3, _netId: number, _tick?: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, netId: _netId, tick: _tick } })
        }
    }
    export async function spawnBulletAtEnemy(_bulletNetId: number, _enemyNetId: number) {
        if (Game.connected) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNBULLETENEMY, bulletNetId: _bulletNetId, enemyNetId: _enemyNetId } })

        }
    }
    export function removeBullet(_netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } })
        }
    }
    //#endregion



    //#region enemy
    function chooseEnemy(_id: Enemy.ENEMYNAME, _properties: Player.Attributes, _position: ƒ.Vector3, _scale: number, _netId: number) {
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                Game.graph.addChild(new Enemy.EnemyDumb(Enemy.ENEMYNAME.BAT, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed)), _position.toVector2(), _scale, _netId));
                break;
            case Enemy.ENEMYNAME.REDTICK:
                let newEnem: Enemy.EnemyDumb = new Enemy.EnemyDumb(Enemy.ENEMYNAME.REDTICK, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed)), _position.toVector2(), _scale, _netId);
                Game.graph.addChild(newEnem);
                break;
        }
    }
    export function spawnEnemy(_enemy: Enemy.Enemy, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, id: _enemy.id, properties: _enemy.properties, position: _enemy.mtxLocal.translation, scale: _enemy.scale, netId: _netId } })
        }
    }
    export function updateEnemyPosition(_position: ƒ.Vector3, _netId: number, _state: Enemy.ANIMATIONSTATES) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId, animation: _state } })
    }
    export function updateEnemyState(_state: Enemy.ANIMATIONSTATES, _netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYSTATE, state: _state, netId: _netId } })
    }
    export function removeEnemy(_netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYDIE, netId: _netId } })
    }
    //#endregion



    //#region items
    export async function spawnItem(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime: number, _netId: number, _attributes?: Player.Attributes, _type?: Items.ITEMTYPE) {
        if (Game.connected && client.idHost == client.id) {
            await client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNITEM, name: _name, description: _description, position: _position, imgSrc: _imgSrc, lifetime: _lifetime, netId: _netId, attributes: _attributes, type: _type } });
        }
    }
    export function updateAvatarAttributes(_attributes: Player.Attributes, _type: Items.ITEMTYPE) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, type: _type } });
    }
    export function removeItem(_netId: number) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ITEMDIE, netId: _netId } })
    }
    //#endregion



    //#region room
    export function sendRoom(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: Generation.ROOMTYPE) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SENDROOM, name: _name, coordiantes: _coordiantes, exits: _exits, roomType: _roomType } })
        }
    }
    export function switchRoomRequest(_coordiantes: [number, number], _direction: [boolean, boolean, boolean, boolean]) {
        if (Game.connected && client.idHost != client.id) {
            client.dispatch({ route: undefined, idTarget: client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, coordiantes: _coordiantes, direction: _direction } })
        }
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
        currentIDs.splice(index, 1);
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: Things we do after the player left the game
    }
}