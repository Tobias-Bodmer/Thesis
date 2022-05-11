///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    export enum FUNCTION {
        CONNECTED,
        SETGAMESTATE,
        LOADED,
        SETREADY,
        SPAWN,
        TRANSFORM,
        CLIENTMOVEMENT,
        SERVERBUFFER,
        UPDATEINVENTORY,
        KNOCKBACKREQUEST,
        KNOCKBACKPUSH,
        SPAWNBULLET,
        BULLETPREDICT,
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
        UPDATEUI,
        SPWANMINIMAP
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let createdRoom: boolean = false;
    export let clients: Array<{ id: string, ready: boolean }> = [];
    export let posUpdate: ƒ.Vector3;
    export let someoneIsHost: boolean = false;
    export let enemy: Enemy.Enemy;
    export let currentIDs: number[] = [];

    document.getElementById("HostSpawn").addEventListener("click", () => { spawnPlayer() }, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", connecting, true);


    export function connecting() {
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

            if (message.content != undefined && message.content.text == FUNCTION.LOADED.toString()) {
                Game.loaded = true;
            }

            if (message.idSource != client.id) {

                if (message.command == FudgeNet.COMMAND.ROOM_CREATE) {
                    console.log(message.content.room);
                    let html: HTMLElement = document.getElementById("RoomId");
                    html.parentElement.style.visibility = "visible";
                    html.textContent = message.content.room;
                    createdRoom = true;
                    joinRoom(message.content.room);
                }

                if (message.command == FudgeNet.COMMAND.ROOM_ENTER) {
                    if (createdRoom) {
                        client.becomeHost();
                    }
                }

                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != client.id && clients.find(element => element == message.content.value) == undefined) {
                            if (clients.find(elem => elem.id == message.content.value) == null) {
                                clients.push({ id: message.content.value, ready: false });
                            }
                        }
                    }

                    if (message.content != undefined && message.content.text == FUNCTION.SETGAMESTATE.toString()) {
                        if (message.content.playing) {
                            Game.playing(false, true);
                        } else if (!message.content.playing) {
                            Game.pause(false, true);
                        }
                    }

                    //SPAWN MINIMAP BY CLIENT
                    if (message.content != undefined && message.content.text == FUNCTION.SPWANMINIMAP.toString()) {
                        let oldMiniMapInfo = message.content.miniMapInfos;
                        let newMiniMapInfo: Interfaces.IMinimapInfos[] = [];
                        for (let i = 0; i < oldMiniMapInfo.length; i++) {
                            let newCoords: Game.ƒ.Vector2 = new Game.ƒ.Vector2(oldMiniMapInfo[i].coords.data[0], oldMiniMapInfo[i].coords.data[1])
                            newMiniMapInfo.push(<Interfaces.IMinimapInfos>{ coords: newCoords, roomType: oldMiniMapInfo[i].roomType })
                        }

                        Game.miniMap = new UI.Minimap(newMiniMapInfo);
                        Game.graph.addChild(Game.miniMap);
                    }

                    //FROM CLIENT INPUT VECTORS FROM AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.CLIENTMOVEMENT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input: Interfaces.IInputAvatarPayload = { tick: message.content.input.tick, inputVector: inputVector, doesAbility: message.content.input.doesAbility }
                        Game.serverPredictionAvatar.updateEntityToCheck(message.content.netId);
                        Game.serverPredictionAvatar.onClientInput(input);
                    }

                    // TO CLIENT CALCULATED POSITION FOR AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.SERVERBUFFER.toString()) {
                        let netObj: Interfaces.INetworkObjects = Game.currentNetObj.find(entity => entity.netId == message.content.netId);
                        let position = new Game.ƒ.Vector3(message.content.buffer.position.data[0], message.content.buffer.position.data[1], message.content.buffer.position.data[2]);
                        let state: Interfaces.IStatePayload = { tick: message.content.buffer.tick, position: position };
                        if (netObj != undefined) {
                            let obj = netObj.netObjectNode;
                            if (obj instanceof Player.Player) {
                                (<Player.Player>obj).client.onServerMovementState(state);
                            } else {
                                (<Bullets.Bullet>obj).clientPrediction.onServerMovementState(state);

                            }
                        }
                    }
                    //FROM CLIENT BULLET VECTORS
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETPREDICT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input: Interfaces.IInputBulletPayload = { tick: message.content.input.tick, inputVector: inputVector }
                        let netObj: Interfaces.INetworkObjects = Game.currentNetObj.find(elem => elem.netId == message.content.netId);
                        let bullet: Bullets.Bullet;
                        if (netObj != undefined) {
                            bullet = <Bullets.Bullet>netObj.netObjectNode;
                            console.log(bullet + "" + message.content.netId);
                            bullet.serverPrediction.updateEntityToCheck(message.content.netId);
                            bullet.serverPrediction.onClientInput(input);
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
                        let attributes: Entity.Attributes = new Entity.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.scale, message.content.attributes.knockbackForce, message.content.attributes.armor, message.content.attributes.coolDownReduction, message.content.attributes.accuracy);
                        if (message.content.type == Entity.ID.MELEE) {
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        } else if (message.content.type == Entity.ID.RANGED) {
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, attributes,
                                netId);
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
                                if (Networking.client.id == Networking.client.idHost) {
                                    // Game.avatar2.avatarPrediction();
                                }
                            }
                        }

                        //Update inventory
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                            let newItem: Items.Item;
                            if (Items.getBuffItemById(message.content.itemId) != null) {
                                newItem = new Items.BuffItem(message.content.itemId, message.content.itemNetId);
                            } else if (Items.getInternalItemById(message.content.itemId) != null) {
                                newItem = new Items.InternalItem(message.content.itemId, message.content.itemNetId);
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
                            let bullet: Bullets.Bullet;
                            let entity: Entity.Entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);

                            if (entity != null) {
                                let weapon: Weapons.Weapon = entity.weapon;
                                let direciton: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                                switch (<Weapons.AIM>message.content.aimType) {
                                    case Weapons.AIM.NORMAL:
                                        bullet = new Bullets.Bullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, message.content.bulletNetId);
                                        break;
                                    case Weapons.AIM.HOMING:
                                        let bulletTarget: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.bulletTarget.data[0], message.content.bulletTarget.data[1], message.content.bulletTarget.data[2]);
                                        bullet = new Bullets.HomingBullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, bulletTarget, message.content.bulletNetId);
                                        break;

                                    default:
                                        break;
                                }

                                Game.graph.addChild(bullet);
                            }
                        }

                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                let newRotation: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.translation = newPosition;
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.rotation = newRotation;
                            }
                        }


                        //Kill bullet at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                            if (client.id != client.idHost) {
                                let bullet = Game.bullets.find(element => element.netId == message.content.netId);

                                if (bullet != undefined) {
                                    bullet.lifetime = 0;
                                    bullet.despawn();
                                }
                            }
                        }

                        //Spawn enemy at the client 
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            //TODO: change attributes
                            EnemySpawner.networkSpawnById(
                                message.content.enemyClass,
                                message.content.id,
                                new ƒ.Vector2(
                                    message.content.position.data[0],
                                    message.content.position.data[1]),
                                message.content.netId, message.content.target);
                        }

                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.setCollider();
                            }
                        }
                        //Sync animation state
                        if (message.content != undefined && message.content.text == FUNCTION.ENTITYANIMATIONSTATE.toString()) {
                            let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                            if (entity != undefined) {
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
                            let buffList: Buff.Buff[] = <Buff.Buff[]>message.content.buffList;
                            let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                            // let newBuffs: Buff.Buff[] = [];
                            entity.buffs.forEach(oldBuff => {
                                let buffToCheck = buffList.find(buff => buff.id == oldBuff.id)
                                if (buffToCheck == undefined) {
                                    oldBuff.removeBuff(entity);
                                }
                            })
                            buffList.forEach(buff => {
                                switch (buff.id) {
                                    case Buff.BUFFID.POISON | Buff.BUFFID.BLEEDING:
                                        new Buff.DamageBuff(buff.id, buff.duration, buff.tickRate, (<Buff.DamageBuff>buff).value).addToEntity(entity);
                                        break;
                                    case Buff.BUFFID.IMMUNE:
                                        new Buff.AttributesBuff(buff.id, buff.duration, buff.tickRate, (<Buff.AttributesBuff>buff).value).addToEntity(entity);
                                        break;
                                }
                            });
                            // entity.buffs.forEach(buff => {
                            //     let flag: boolean = false;
                            //     buffList.forEach(newBuff => {
                            //         if (buff.id == newBuff.id) {
                            //             flag = true;
                            //         }
                            //     })
                            //     if (!flag) {
                            //         entity.removeChild(entity.getChildren().find(child => (<UI.Particles>child).id == buff.id));
                            //     }
                            // });
                            // entity.buffs = newBuffs;
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
                                    let newItem = new Items.BuffItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]))
                                    Game.graph.addChild(newItem);
                                } else if (Items.getInternalItemById(message.content.id) != null) {
                                    let newItem = new Items.InternalItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                    Game.graph.addChild(newItem);
                                }
                            }
                        }

                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            switch (message.content.payload.type) {
                                case Entity.ATTRIBUTETYPE.HEALTHPOINTS:
                                    entity.attributes.healthPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS:
                                    entity.attributes.maxHealthPoints = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.KNOCKBACKFORCE:
                                    entity.attributes.knockbackForce = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.HITABLE:
                                    entity.attributes.hitable = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.ARMOR:
                                    entity.attributes.armor = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.SPEED:
                                    entity.attributes.speed = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.ATTACKPOINTS:
                                    entity.attributes.attackPoints = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION:
                                    entity.attributes.coolDownReduction = message.content.payload.value
                                    break;
                                case Entity.ATTRIBUTETYPE.SCALE:
                                    entity.attributes.scale = message.content.payload.value
                                    entity.updateScale();
                                    break;
                            }
                        }

                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            const tempWeapon: Weapons.Weapon = new Weapons.Weapon(message.content.weapon.cooldownTime, message.content.weapon.attackCount, message.content.weapon.bulletType, message.content.weapon.projectileAmount, message.content.weapon.owner, message.content.weapon.aimType);
                            (<Player.Player>Game.entities.find(elem => elem.netId == message.content.netId)).weapon = tempWeapon;
                        }

                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => (<Items.Item>enem).netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let coordiantes: Game.ƒ.Vector2 = new Game.ƒ.Vector2(message.content.room.coordinates.data[0], message.content.room.coordinates.data[1]);
                            let tanslation: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.room.translation.data[0], message.content.room.translation.data[1], message.content.room.translation.data[2]);
                            let roomInfo: Interfaces.IRoom = { coordinates: coordiantes, roomSize: message.content.room.roomSize, exits: message.content.room.exits, roomType: message.content.room.roomType, translation: tanslation };
                            let newRoom: Generation.Room;
                            switch (roomInfo.roomType) {
                                case Generation.ROOMTYPE.START:
                                    newRoom = new Generation.StartRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.NORMAL:
                                    newRoom = new Generation.NormalRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.BOSS:
                                    newRoom = new Generation.BossRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.TREASURE:
                                    newRoom = new Generation.TreasureRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.MERCHANT:
                                    newRoom = new Generation.MerchantRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                            }
                            newRoom.exits = roomInfo.exits;
                            newRoom.mtxLocal.translation = roomInfo.translation;
                            newRoom.setSpawnPoints();
                            newRoom.openDoors();
                            Generation.addRoomToGraph(newRoom);

                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            Generation.switchRoom(message.content.direction);
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

    export function setGamestate(_playing: boolean) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.SETGAMESTATE, playing: _playing } });
    }

    export function createRoom() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }

    export function joinRoom(_roomId: string) {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }

    //#region player
    export function loaded() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.LOADED } });
    }

    export function spawnPlayer() {
        if (Game.avatar1.id == Entity.ID.MELEE) {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } })
        } else {
            client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } })
        }
    }


    export function setClient() {
        client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }

    export function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } })
    }


    export function sendClientInput(_netId: number, _inputPayload: Interfaces.IInputAvatarPayload) {
        client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.CLIENTMOVEMENT, netId: _netId, input: _inputPayload } })
    }

    export function sendServerBuffer(_netId: number, _buffer: Interfaces.IStatePayload) {
        if (Networking.client.idHost == Networking.client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.SERVERBUFFER, netId: _netId, buffer: _buffer } })
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

    export function spawnMinimap(_miniMapInfos: Interfaces.IMinimapInfos[]) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } })
    }
    //#endregion




    //#region bullet
    export function spawnBullet(_aimType: Weapons.AIM, _direction: ƒ.Vector3, _bulletNetId: number, _ownerNetId: number, _bulletTarget?: ƒ.Vector3) {
        if (Game.connected) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.SPAWNBULLET, aimType: _aimType, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId, bulletTarget: _bulletTarget } })
        }
    }
    export function sendBulletInput(_netId: number, _inputPayload: Interfaces.IInputBulletPayload) {
        client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } })
    }

    export function updateBullet(_position: ƒ.Vector3, _rotation: ƒ.Vector3, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } })
        }
    }
    export function removeBullet(_netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } })
        }
    }
    //#endregion



    //#region enemy
    export function spawnEnemy(_enemyClass: Enemy.ENEMYCLASS, _enemy: Enemy.Enemy, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } })
        }
    }
    export function updateEnemyPosition(_position: ƒ.Vector3, _netId: number) {
        if(Networking.client.id == Networking.client.idHost){
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } })
        }
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
    export function spawnItem(_id: number, _position: ƒ.Vector2, _netId: number) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, id: _id, position: _position, netId: _netId } });
        }
    }
    export function updateEntityAttributes(_attributePayload: Interfaces.IAttributeValuePayload, _netId: number) {
        if (client.idHost != client.id) {
            client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
        else {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
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
    export function sendRoom(_room: Interfaces.IRoom) {
        if (Game.connected && client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } })
        }
    }
    export function switchRoomRequest(_direction: Interfaces.IRoomExits) {
        if (Game.connected && client.idHost != client.id) {
            client.dispatch({ route: undefined, idTarget: client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, direction: _direction } })
        }
    }
    //#endregion




    export function idGenerator(): number {
        let id = Math.floor(Math.random() * 1000);
        if (currentIDs.find(element => element == id)) {
            idGenerator();
        }
        else {
            currentIDs.push(id);
        }

        return id;
    }

    export function popID(_id: number) {
        currentIDs = currentIDs.filter(elem => elem != _id)
    }

    export function isNetworkObject(_object: any): _object is Interfaces.INetworkable {
        return "netId" in _object;
    }

    export function getNetId(_object: Game.ƒ.Node): number {
        if (isNetworkObject(_object)) {
            return _object.netId;
        }
        return null;
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: Things we do after the player left the game
    }
}