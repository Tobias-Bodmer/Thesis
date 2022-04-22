///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        CONNECTED,
        HOST,
        SETREADY,
        SPAWN,
        TRANSFORM,
        AVATARPREDICTION,
        UPDATEINVENTORY,
        KNOCKBACKREQUEST,
        KNOCKBACKPUSH,
        SPAWNBULLET,
        SPAWNBULLETENEMY,
        BULLETTRANSFORM,
        BULLETDIE,
        SPAWNENEMY,
        ENEMYTRANSFORM,
        ENTITYANIMATIONSTATE,
        ENEMYDIE,
        SPAWNINTERNALITEM,
        UPDATEATTRIBUTES,
        UPDATEWEAPON,
        ITEMDIE,
        SENDROOM,
        SWITCHROOMREQUEST,
        UPDATEBUFF,
        UPDATEUI
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let clients: Array<{ id: string, ready: boolean }> = [];
    export let posUpdate: ƒ.Vector3;
    export let someoneIsHost: boolean = false;
    export let enemy: Enemy.Enemy;
    export let currentIDs: number[] = [];

    document.getElementById("HostSpawn").addEventListener("click", () => { spawnPlayer() }, true);
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
                        let netId: number = message.content.netId
                        if (message.content.type == Player.PLAYERTYPE.MELEE) {
                            const attributes: Entity.Attributes = message.content.attributes;
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, attributes, netId);


                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        } else if (message.content.type == Player.PLAYERTYPE.RANGED) {
                            const attributes: Entity.Attributes = message.content.attributes
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        }
                    }

                    //Runtime updates and communication
                    if (Game.connected) {

                        //Sync avatar2 position and rotation
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            // let test: Game.ƒ.Vector3 = message.content.value.data;
                            // // console.log(test);
                            let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                            let rotateVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);

                            if (Game.avatar2 != undefined) {
                                Game.avatar2.mtxLocal.translation = moveVector;
                                Game.avatar2.mtxLocal.rotation = rotateVector;
                                Game.avatar2.collider.position = moveVector.toVector2();
                            }
                        }

                        if (message.content != undefined && message.content.text == FUNCTION.AVATARPREDICTION.toString()) {
                            if (client.id != client.idHost) {
                                let newPosition: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.avatar1.hostPositions[message.content.tick] = newPosition;
                            }
                        }

                        //Update inventory
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                            let newItem: Items.Item;
                            if (Items.getBuffItemById(message.content.itemId) != null) {
                                newItem = new Items.BuffItem(message.content.itemId, ƒ.Vector2.ZERO(), message.content.itemNetId);
                            } else if (Items.getInternalItemById(message.content.itemId) != null) {
                                newItem = new Items.InternalItem(message.content.itemId, ƒ.Vector2.ZERO(), message.content.itemNetId);
                            }
                            Game.entities.find(elem => (<Player.Player>elem).netId == message.content.netId).items.push(newItem);
                        }

                        //Client request for move knockback
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKREQUEST.toString()) {
                            let position: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            let enemy: Enemy.Enemy = Game.enemies.find(elem => elem.netId == message.content.netId);

                            enemy.getKnockback(message.content.knockbackForce, position);
                        }

                        //Host push move knockback from enemy
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKPUSH.toString()) {
                            if (client.id != client.idHost) {
                                let position: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);

                                Game.avatar1.getKnockback(message.content.knockbackForce, position);
                            }
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
                                let newPosition: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
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
                            //TODO: change attributes
                            const attributes: Entity.Attributes = message.content.attributes;
                            EnemySpawner.networkSpawnById(
                                message.content.id,
                                new ƒ.Vector2(
                                    message.content.position.data[0],
                                    message.content.position.data[1]),
                                attributes
                                , message.content.netId);
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
                        if (message.content != undefined && message.content.text == FUNCTION.ENTITYANIMATIONSTATE.toString()) {
                            let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                            if (entity != undefined) {
                                console.log(message.content.state);
                                entity.switchAnimation(message.content.state);
                            }
                        }

                        //Kill enemy at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(enemy);
                            popID(message.content.netId);
                        }

                        //update Entity buff List
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                            const buffList: Buff.Buff[] = <Buff.Buff[]>message.content.buffList;
                            console.log(buffList);
                            let newBuffs: Buff.Buff[] = [];
                            buffList.forEach(buff => {
                                switch (buff.id) {
                                    case Buff.BUFFID.POISON:
                                        newBuffs.push(new Buff.DamageBuff(buff.id, buff.duration, buff.tickRate, (<Buff.DamageBuff>buff).value));
                                        break;
                                }
                            });
                            let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                            entity.buffs.forEach(buff => {
                                let flag: boolean = false;
                                newBuffs.forEach(newBuff => {
                                    if (buff.id == newBuff.id) {
                                        flag = true;
                                    }
                                })
                                if (!flag) {
                                    entity.removeChild(entity.getChildren().find(child => (<UI.Particles>child).id == buff.id));

                                }
                            });
                            entity.buffs = newBuffs;
                        }



                        //update UI
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                            let position: ƒ.Vector2 = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                            Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                        }

                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                            if (client.id != client.idHost) {
                                if (Items.getBuffItemById(message.content.id) != null) {
                                    Game.graph.addChild(new Items.BuffItem(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId));
                                } else if (Items.getInternalItemById(message.content.id) != null) {
                                    Game.graph.addChild(new Items.InternalItem(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId));
                                }
                            }
                        }

                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            const tempAttributes: Entity.Attributes = message.content.attributes;
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            entity.attributes = tempAttributes;
                            entity.mtxLocal.scale(new ƒ.Vector3(Game.avatar2.attributes.scale, Game.avatar2.attributes.scale, Game.avatar2.attributes.scale));
                        }

                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            let weapon: Weapons.Weapon = message.content.weapon;
                            console.log(weapon.projectileAmount);
                            const tempWeapon: Weapons.Weapon = new Weapons.Weapon(weapon.cooldownTime, weapon.attackCount, weapon.bulletType, weapon.projectileAmount, weapon.owner);
                            (<Player.Player>Game.entities.find(elem => elem.netId == message.content.netId)).weapon = tempWeapon;
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
                            let room: Generation.Room = new Generation.Room(message.content.name, message.content.coordiantes, message.content.exits, message.content.roomType);

                            console.warn(message.content.direciton);

                            if (message.content.direciton != null) {
                                Generation.addRoomToGraph(room, message.content.direciton);
                            } else {
                                Generation.addRoomToGraph(room);
                            }
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
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } })
        } else if (_type == Player.PLAYERTYPE.RANGED) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } })
        } else {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } })
        }
    }

    export function setClient() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }

    export function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } })
    }

    export function avatarPrediction(_position: Game.ƒ.Vector3, _tick: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.AVATARPREDICTION, position: _position, tick: _tick } })
        }
    }

    export function knockbackRequest(_netId: number, _knockbackForce: number, _position: Game.ƒ.Vector3) {
        client.dispatch({ route: undefined, idTarget: client.idHost, content: { text: FUNCTION.KNOCKBACKREQUEST, netId: _netId, knockbackForce: _knockbackForce, position: _position } })
    }

    export function knockbackPush(_knockbackForce: number, _position: Game.ƒ.Vector3) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.KNOCKBACKPUSH, knockbackForce: _knockbackForce, position: _position } })
    }

    export function updateInventory(_itemId: Items.ITEMID, _itemNetId: number, _netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.UPDATEINVENTORY, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } })
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
    export function spawnEnemy(_enemy: Enemy.Enemy, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId } })
        }
    }
    export function updateEnemyPosition(_position: ƒ.Vector3, _netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } })
    }
    export function updateEntityAnimationState(_state: Entity.ANIMATIONSTATES, _netId: number) {
        if (Networking.client.idHost == Networking.client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } })
        }
        // else {
        //     client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id == client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } })

        // }
    }
    export function removeEnemy(_netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYDIE, netId: _netId } })
    }
    //#endregion



    //#region items
    export function spawnItem(_item: Items.Item, _id: number, _position: ƒ.Vector2, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, item: _item, id: _id, position: _position, netId: _netId } });
        }
    }
    export function updateEntityAttributes(_attributes: Entity.Attributes, _netId: number) {
        if (client.idHost != client.id) {
            client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, netId: _netId } });
        }
        else {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, netId: _netId } });
        }
    }
    export function updateAvatarWeapon(_weapon: Weapons.Weapon, _targetNetId: number) {
        if (client.idHost != client.id) {
            client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
        }
        else {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
        }
    }

    export function removeItem(_netId: number) {
        if (client.idHost != client.id) {
            client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.ITEMDIE, netId: _netId } })
        }
        else {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ITEMDIE, netId: _netId } })

        }
    }
    //#endregion
    //#region buffs
    export function updateBuffList(_buffList: Buff.Buff[], _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    //#endregion

    //#region UI
    export function updateUI(_position: Game.ƒ.Vector2, _value: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    //#endregion


    //#region room
    export function sendRoom(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: Generation.ROOMTYPE, _direciton?: [boolean, boolean, boolean, boolean]) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SENDROOM, name: _name, coordiantes: _coordiantes, exits: _exits, roomType: _roomType, direciton: _direciton } })
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