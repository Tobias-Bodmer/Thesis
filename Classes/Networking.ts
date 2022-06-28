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
        SENDMAGAZIN,
        SPAWNENEMY,
        ENEMYTRANSFORM,
        ENTITYANIMATIONSTATE,
        ENTITYDIE,
        SPAWNINTERNALITEM,
        UPDATEATTRIBUTES,
        UPDATEWEAPON,
        ITEMDIE,
        SENDROOM,
        SWITCHROOMREQUEST,
        UPDATEBUFF,
        UPDATEUI,
        SPWANMINIMAP,
        SPAWNZIPZAP
    }

    import ƒClient = FudgeNet.FudgeClient;

    export let client: ƒClient;
    export let createdRoom: boolean = false;
    export let clients: Array<{ id: string, ready: boolean }> = [];
    export let posUpdate: ƒ.Vector3;
    export let someoneIsHost: boolean = false;
    export let enemy: Enemy.Enemy;
    export let currentIDs: number[] = [];


    export function connecting() {
        client = new ƒClient();
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer("wss:thesis-fudgeserver.herokuapp.com");

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

                if (message.command == FudgeNet.COMMAND.ROOM_GET_IDS) {
                    if (message.content != undefined && document.getElementById("Hostscreen").style.visibility != "hidden") {
                        let rooms: string[] = message.content.rooms;
                        document.getElementById("Rooms").innerHTML = "";
                        if (rooms.length > 0) {
                            let newRooms: string[] = [];
                            rooms.forEach(room => {
                                if (room != "Lobby") {
                                    newRooms.push("<p>" + room + "</p>");
                                }
                            });
                            document.getElementById("Rooms").innerHTML = newRooms.toString().replaceAll(",", "");
                        }
                        setTimeout(() => {
                            getRooms();
                        }, 5000);
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

                        if (Game.miniMap != undefined) {
                            Game.graph.removeChild(Game.miniMap);
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
                        let rotation = new Game.ƒ.Vector3(message.content.buffer.rotation.data[0], message.content.buffer.rotation.data[1], message.content.buffer.rotation.data[2]);
                        let state: Interfaces.IStatePayload = { tick: message.content.buffer.tick, position: position, rotation: rotation };
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
                        let inputRotationVector = new Game.ƒ.Vector3(message.content.input.rotation.data[0], message.content.input.rotation.data[1], message.content.input.rotation.data[2]);
                        let input: Interfaces.IInputBulletPayload = { tick: message.content.input.tick, inputVector: inputVector, rotation: inputRotationVector }
                        let netObj: Interfaces.INetworkObjects = Game.currentNetObj.find(elem => elem.netId == message.content.netId);
                        let bullet: Bullets.Bullet;
                        if (netObj != undefined) {
                            bullet = <Bullets.Bullet>netObj.netObjectNode;
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
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, netId);
                        } else if (message.content.type == Entity.ID.RANGED) {
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, netId);
                        }
                        Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                        Game.avatar2.attributes = attributes;
                    }

                    //Runtime updates and communication
                    //Sync avatar2 position and rotation
                    if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                        let moveVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                        let rotateVector: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);

                        if (Game.avatar2 != undefined) {
                            Game.avatar2.mtxLocal.translation = moveVector;
                            Game.avatar2.mtxLocal.rotation = rotateVector;
                            Game.avatar2.collider.position = moveVector.toVector2();
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


                        let entity = Game.entities.find(elem => (<Player.Player>elem).netId == message.content.netId);

                        if (message.content.add) {
                            newItem.addItemToEntity(<Player.Player>entity);
                        } else {
                            newItem.removeItemFromEntity(<Player.Player>entity);
                        }

                        if (Game.avatar1 == entity) {
                            UI.itemPopUp(newItem);
                        }
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

                    //Spawn normal bullet from host
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                        let bullet: Bullets.Bullet;
                        let entity: Entity.Entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);
                        if (entity != null) {
                            let direction: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);

                            if (message.content.bulletType == null && entity instanceof Player.Melee) {
                                entity.attack(direction);
                                return;
                            }

                            if (message.content.bulletType == Bullets.BULLETCLASS.NORMAL) {
                                bullet = new Bullets.NormalBullet(entity.weapon.bulletType, entity.mtxLocal.translation.toVector2(), direction, message.content.ownerNetId, message.content.bulletNetId)
                            }
                            if (message.content.bulletType == Bullets.BULLETCLASS.FALLING) {
                                bullet = new Bullets.FallingBullet(entity.weapon.bulletType, entity.mtxLocal.translation.toVector2(), message.content.ownerNetId, message.content.bulletNetId)
                            }
                            bullet.spawn();
                        }
                    }

                    //Send magazin
                    if (message.content != undefined && message.content.text == FUNCTION.SENDMAGAZIN.toString()) {
                        let entity: Entity.Entity = Game.entities.find(elem => elem.netId == message.content.magazin.ownerNetId);
                        let tempMagazin: Interfaces.IMagazin = message.content.magazin;
                        (<Weapons.RangedWeapon>entity.weapon).magazin = [];
                        for (let i = 0; i < tempMagazin.bulletTypes.length; i++) {
                            let direction: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.magazin.directions[i].data[0], message.content.magazin.directions[i].data[1], 0);
                            if ((<Weapons.RangedWeapon>entity.weapon).aimType == Weapons.AIM.NORMAL) {
                                (<Weapons.RangedWeapon>entity.weapon).magazin.push(new Bullets.NormalBullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, tempMagazin.netIds[i]));
                            } else {
                                console.log(tempMagazin);
                                (<Weapons.RangedWeapon>entity.weapon).magazin.push(new Bullets.HomingBullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, new Game.ƒ.Vector3(message.content.magazin.targets[i].data[0], message.content.magazin.targets[i].data[1], message.content.magazin.targets[i].data[2]), tempMagazin.netIds[i]));
                            }
                        }
                        (<Weapons.RangedWeapon>entity.weapon).shoot(Game.ƒ.Vector3.ZERO(), false);
                    }

                    //Sync bullet transform from host to client
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                        if (Game.currentNetObj.find(element => element.netId == message.content.netId) != undefined) {
                            if (Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode != null) {
                                let newPosition: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                let newRotation: Game.ƒ.Vector3 = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.translation = newPosition;
                                Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.rotation = newRotation;
                            }
                        }
                    }


                    //Kill bullet at the client from host
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                        if (client.id != client.idHost) {
                            let bullet = Game.bullets.find(element => element.netId == message.content.netId);

                            if (bullet != undefined) {
                                bullet.despawn();
                            }
                        }
                    }

                    //Spawn enemy at the client 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
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

                    //Kill entity at the client from host
                    if (message.content != undefined && message.content.text == FUNCTION.ENTITYDIE.toString()) {
                        let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.die()
                        }
                    }

                    //update Entity buff List
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                        let buffList: Buff.Buff[] = <Buff.Buff[]>message.content.buffList;
                        let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.buffs.forEach(oldBuff => {
                                let buffToCheck = buffList.find(buff => buff.id == oldBuff.id)
                                if (buffToCheck == undefined) {
                                    oldBuff.removeBuff(entity);
                                }
                            })
                            buffList.forEach(buff => {
                                let newBuff = Buff.getBuffById(buff.id);
                                newBuff.tickRate = buff.tickRate;
                                newBuff.duration = buff.duration;
                                newBuff.addToEntity(entity);
                            });
                        }
                    }



                    //update UI
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                        let position: ƒ.Vector2 = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                        Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                    }

                    //spawn special items
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNZIPZAP.toString()) {
                        if (client.id != client.idHost) {
                            let item: Bullets.ZipZapObject = new Bullets.ZipZapObject(message.content.ownerNetId, message.content.netId);
                            item.spawn();
                        }
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
                        let refAttributes = <Entity.Attributes>message.content.payload.value;
                        let entity = Game.entities.find(elem => elem.netId == message.content.netId);

                        entity.updateScale(refAttributes.scale, false);

                        entity.attributes.accuracy = refAttributes.accuracy;
                        entity.attributes.armor = refAttributes.armor;
                        entity.attributes.attackPoints = refAttributes.attackPoints;
                        entity.attributes.coolDownReduction = refAttributes.coolDownReduction;
                        entity.attributes.maxHealthPoints = refAttributes.maxHealthPoints;
                        entity.attributes.healthPoints = refAttributes.healthPoints;
                        entity.attributes.hitable = refAttributes.hitable;
                        entity.attributes.knockbackForce = refAttributes.knockbackForce;
                        entity.attributes.speed = refAttributes.speed;
                        entity.attributes.scale = refAttributes.scale;
                    }

                    //apply weapon
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                        let entity = (<Player.Player>Game.entities.find(elem => elem.netId == message.content.netId));

                        let refWeapon: Weapons.Weapon = <Weapons.Weapon>message.content.weapon;
                        let tempWeapon;
                        switch (message.content.type) {
                            case Weapons.WEAPONTYPE.RANGEDWEAPON:
                                tempWeapon = new Weapons.RangedWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.MELEEWEAPON:
                                tempWeapon = new Weapons.MeleeWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.THORSHAMMERWEAPON:
                                tempWeapon = new Weapons.ThorsHammer(message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId);
                                tempWeapon.weaponStorage = entity.weapon;
                                break;
                            default:
                                console.warn(Weapons.WEAPONTYPE[message.content.type] + " does not exist in Networking switch");
                                break;
                        }

                        if (entity.weapon instanceof Weapons.ThorsHammer) {
                            entity.weapon = (<Weapons.ThorsHammer>entity.weapon).weaponStorage;
                        } else {
                            (<Weapons.RangedWeapon>tempWeapon).ItemFunctions = (<Weapons.RangedWeapon>entity.weapon).ItemFunctions;
                            entity.weapon = tempWeapon;
                        }
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
                        console.warn("room: " + roomInfo);
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
                            case Generation.ROOMTYPE.CHALLENGE:
                                newRoom = new Generation.ChallengeRoom(roomInfo.coordinates, roomInfo.roomSize);
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
                        if (message.content.direction == null && Game.currentRoom instanceof Generation.BossRoom) {
                            (<Generation.BossRoom>Game.currentRoom).exitDoor.changeRoom();
                        } else {
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
        client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }

    export function joinRoom(_roomId: string) {
        client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }

    export function getRooms() {
        client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_GET_IDS });
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

    export function updateInventory(_add: boolean, _itemId: Items.ITEMID, _itemNetId: number, _netId: number) {
        if (client.id == client.idHost) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } })
        }
    }

    export function spawnMinimap(_miniMapInfos: Interfaces.IMinimapInfos[]) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } })
    }
    //#endregion




    //#region bullet
    export function spawnBullet(_bulletType: Bullets.BULLETCLASS, _direction: ƒ.Vector3, _bulletNetId: number, _ownerNetId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.SPAWNBULLET, bulletType: _bulletType, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId } })
    }

    export function sendMagazin(_magazin: Interfaces.IMagazin) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.id).id, content: { text: FUNCTION.SENDMAGAZIN, magazin: _magazin } })
    }

    export function sendBulletInput(_netId: number, _inputPayload: Interfaces.IInputBulletPayload) {
        client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } })
    }

    export function updateBullet(_position: ƒ.Vector3, _rotation: ƒ.Vector3, _netId: number) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } })
        }
    }
    export function removeBullet(_netId: number) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } })
        }
    }
    //#endregion

    //#region specialItems
    export function spawnZipZap(_ownerNetId: number, _netId: number) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNZIPZAP, ownerNetId: _ownerNetId, netId: _netId } })
        }
    }
    //#endregion

    //#region enemy
    export function spawnEnemy(_enemyClass: Enemy.ENEMYCLASS, _enemy: Enemy.Enemy, _netId: number) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } })
        }
    }
    
    export function updateEnemyPosition(_position: ƒ.Vector3, _netId: number) {
        if (Networking.client.id == Networking.client.idHost) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } })
        }
    }

    export function updateEntityAnimationState(_state: Entity.ANIMATIONSTATES, _netId: number) {
        if (Networking.client.idHost == Networking.client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } })
        }
    }

    export function removeEntity(_netId: number) {
        client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.ENTITYDIE, netId: _netId } })
    }
    //#endregion



    //#region items
    export function spawnItem(_id: number, _position: ƒ.Vector2, _netId: number) {
        if (client.idHost == client.id) {
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
            client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
        }
        else {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
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
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    //#endregion

    //#region UI
    export function updateUI(_position: Game.ƒ.Vector2, _value: number) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    //#endregion


    //#region room
    export function sendRoom(_room: Interfaces.IRoom) {
        if (client.idHost == client.id) {
            client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id != client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } })
        }
    }
    export function switchRoomRequest(_direction: Interfaces.IRoomExits) {
        if (client.idHost != client.id) {
            client.dispatch({ route: undefined, idTarget: client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, direction: _direction } })
        }
    }
    //#endregion

    /**
     * generates individual IDs on Host without duplicates returns the given NetId
     * @param _netId if undefined generates a new NetId -> only undefined on Host
     * @returns a new netId or the netId provided by the host
     */
    export function IdManager(_netId: number): number {
        if (_netId != undefined) {
            currentIDs.push(_netId);
            return _netId;
        }
        else {
            return generateNewId();
        }
    }

    function generateNewId(): number {
        let newId: number;
        while (true) {
            newId = idGenerator();
            if (currentIDs.find(id => id == newId) == undefined) {
                break;
            }
        }
        currentIDs.push(newId);
        return newId;
    }

    function idGenerator(): number {
        let id = Math.floor(Math.random() * 1000);
        return id;
    }

    export function popID(_id: number) {
        currentIDs.splice(currentIDs.indexOf(_id), 1);
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