namespace Generation {

    let numberOfRooms: number = 2;
    export let usedPositions: Game.ƒ.Vector2[] = [];
    export let rooms: Room[] = [];

    //spawn chances
    let challengeRoomSpawnChance: number = 30;
    let treasureRoomSpawnChance: number = 100;

    export function generateRooms(): void {
        let startCoords: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();

        rooms.push(new Room("roomStart", startCoords, <Interfaces.IRoomExits>{ north: true, east: true, south: true, west: true }, Generation.ROOMTYPE.START))
        usedPositions.push(startCoords);

        for (let i: number = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(rooms[rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        rooms.forEach(room => {
            calcRoomDoors(room);
            console.log(room.coordinates + " " + room.exits.north + " " + room.exits.east + " " + room.exits.south + " " + room.exits.west + " " + room.roomType.toString());
        })
        // usedPositions.forEach(element => {
        //     console.log(element.x + "-" + element.y);
        // });
        placeRoomsLocal(rooms[0]);

        for (let i = 0; i < rooms.length; i++) {
            rooms[i].setDoors();
            rooms[i].addWalls();
        }

        addRoomToGraph(rooms[0]);
        sendRoom(<Interfaces.IRoom>{ coordinates: rooms[0].coordinates, direction: null, exits: rooms[0].exits, roomType: rooms[0].roomType, translation: rooms[0].mtxLocal.translation });
    }

    function placeRoomsLocal(_firstRoom: Room) {
        if (_firstRoom.neighbourN != undefined && !_firstRoom.neighbourN.positionUpdated) {
            _firstRoom.neighbourN.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), _firstRoom.neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), -0.01);
            _firstRoom.neighbourN.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourN);
        }
        if (_firstRoom.neighbourE != undefined && !_firstRoom.neighbourE.positionUpdated) {
            _firstRoom.neighbourE.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), _firstRoom.neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), -0.01);
            _firstRoom.neighbourE.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourE);
        }
        if (_firstRoom.neighbourS != undefined && !_firstRoom.neighbourS.positionUpdated) {
            _firstRoom.neighbourS.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), _firstRoom.neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), -0.01);
            _firstRoom.neighbourS.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourS);
        }
        if (_firstRoom.neighbourW != undefined && !_firstRoom.neighbourW.positionUpdated) {
            _firstRoom.neighbourW.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), _firstRoom.neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), -0.01);
            _firstRoom.neighbourW.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourW);
        }
    }

    function sendRoom(_room: Interfaces.IRoom) {
        Networking.sendRoom(_room);
    }

    function addRoom(_currentRoom: Room, _roomType: Generation.ROOMTYPE): void {
        let numberOfExits: number = countBool(_currentRoom.exits);
        let randomNumber: number = Math.round(Math.random() * (numberOfExits));
        let possibleExitIndex: number[] = getExitIndex(_currentRoom.exits);
        // console.log(_roomType + ": " + possibleExitIndex + "____ " + randomNumber);
        let newRoomPosition: Game.ƒ.Vector2;
        let newRoom: Room;
        let newCoord: Game.ƒ.Vector2;
        let defaultExits: Interfaces.IRoomExits = <Interfaces.IRoomExits>{ north: true, east: true, south: true, west: true };


        console.log(numberOfExits);
        console.log(possibleExitIndex[randomNumber]);
        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y + 1);
                newCoord = usedPositions.find(room => room.equals(newRoomPosition));
                if (newCoord == undefined) {
                    newRoom = new Room("roomNormal", (newRoomPosition), defaultExits, _roomType);
                    rooms.push(newRoom);
                    _currentRoom.neighbourN = newRoom;
                    _currentRoom.exits.north = false;
                    newRoom.neighbourS = _currentRoom;
                    newRoom.exits.south = false;
                    usedPositions.push(newRoomPosition);
                } else {
                    let foundRoom = rooms.find(room => room.coordinates.equals(newCoord))
                    _currentRoom.neighbourN = foundRoom;
                    foundRoom.neighbourS = _currentRoom;
                    _currentRoom.exits.north = false;
                    addRoom(_currentRoom, _roomType);
                }
                break;
            case 1: // east
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x + 1, _currentRoom.coordinates.y);
                newCoord = usedPositions.find(room => room.equals(newRoomPosition));
                if (newCoord == undefined) {
                    newRoom = new Room("roomNormal", (newRoomPosition), defaultExits, _roomType);
                    rooms.push(newRoom);
                    _currentRoom.neighbourE = newRoom;
                    _currentRoom.exits.east = false;
                    newRoom.neighbourW = _currentRoom;
                    newRoom.exits.west = false;
                    usedPositions.push(newRoomPosition);
                } else {
                    let foundRoom = rooms.find(room => room.coordinates.equals(newCoord))
                    _currentRoom.neighbourE = foundRoom;
                    foundRoom.neighbourW = _currentRoom;
                    _currentRoom.exits.east = false;
                    addRoom(_currentRoom, _roomType);
                }

                break;
            case 2: // south
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y - 1);
                newCoord = usedPositions.find(room => room.equals(newRoomPosition));
                if (newCoord == undefined) {
                    newRoom = new Room("roomNormal", (newRoomPosition), defaultExits, _roomType);
                    rooms.push(newRoom);
                    _currentRoom.neighbourS = newRoom;
                    _currentRoom.exits.south = false;
                    newRoom.neighbourN = _currentRoom;
                    newRoom.exits.north = false;
                    usedPositions.push(newRoomPosition);
                } else {
                    let foundRoom = rooms.find(room => room.coordinates.equals(newCoord))
                    _currentRoom.neighbourS = foundRoom;
                    foundRoom.neighbourN = _currentRoom;
                    _currentRoom.exits.south = false;
                    addRoom(_currentRoom, _roomType);
                }
                break;
            case 3: //west
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x - 1, _currentRoom.coordinates.y);
                newCoord = usedPositions.find(room => room.equals(newRoomPosition));
                if (newCoord == undefined) {
                    newRoom = new Room("roomNormal", (newRoomPosition), defaultExits, _roomType);
                    rooms.push(newRoom);
                    _currentRoom.neighbourW = newRoom;
                    _currentRoom.exits.west = false;
                    newRoom.neighbourE = _currentRoom;
                    newRoom.exits.east = false;
                    usedPositions.push(newRoomPosition);
                } else {
                    let foundRoom = rooms.find(room => room.coordinates.equals(newCoord))
                    _currentRoom.neighbourW = foundRoom;
                    foundRoom.neighbourE = _currentRoom;
                    _currentRoom.exits.west = false;
                    addRoom(_currentRoom, _roomType);
                }
                break;
            default:
                break;
        }
        // _currentRoom.setRoomCoordinates();

    }

    function addSpecialRooms(): void {
        rooms.forEach(room => {
            // room.exits = calcPathExits(room.coordinates);
            if (isSpawning(treasureRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.TREASURE);
                return;
            }
            if (isSpawning(challengeRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.CHALLENGE)
                return;
            }
        });
    }

    function isSpawning(_spawnChance: number): boolean {
        let x = Math.random() * 100;
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }


    function countBool(_exits: Interfaces.IRoomExits): number {
        let counter: number = -1;
        if (_exits.north) {
            counter++;
        }
        if (_exits.east) {
            counter++;
        }
        if (_exits.south) {
            counter++;
        }
        if (_exits.west) {
            counter++;
        }
        return counter;
    }


    function getExitIndex(_exits: Interfaces.IRoomExits): number[] {
        let numbers: number[] = [];
        if (_exits.north) {
            numbers.push(0)
        }
        if (_exits.east) {
            numbers.push(1)
        }
        if (_exits.west) {
            numbers.push(2)
        }
        if (_exits.south) {
            numbers.push(3)
        }
        return numbers;

    }

    function calcRoomDoors(_room: Generation.Room) {
        if (usedPositions.find(room => room.equals(new Game.ƒ.Vector2(_room.coordinates.x, _room.coordinates.y + 1))) != undefined) {
            _room.exits.north = true;
            if (_room.neighbourN == undefined) {
                _room.neighbourN = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_room.coordinates.x, _room.coordinates.y + 1)));
            }
        } else {
            _room.exits.north = false;
        }
        if (usedPositions.find(room => room.equals(new Game.ƒ.Vector2(_room.coordinates.x + 1, _room.coordinates.y))) != undefined) {
            _room.exits.east = true;
            if (_room.neighbourE == undefined) {
                _room.neighbourE = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_room.coordinates.x + 1, _room.coordinates.y)));
            }
        } else {
            _room.exits.east = false;
        }
        if (usedPositions.find(room => room.equals(new Game.ƒ.Vector2(_room.coordinates.x, _room.coordinates.y - 1))) != undefined) {
            _room.exits.south = true;
            if (_room.neighbourS == undefined) {
                _room.neighbourS = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_room.coordinates.x, _room.coordinates.y - 1)));
            }
        } else {
            _room.exits.south = false;
        }
        if (usedPositions.find(room => room.equals(new Game.ƒ.Vector2(_room.coordinates.x - 1, _room.coordinates.y))) != undefined) {
            _room.exits.west = true;
            if (_room.neighbourW == undefined) {
                _room.neighbourW = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_room.coordinates.x - 1, _room.coordinates.y)));
            }
        } else {
            _room.exits.west = false;
        }
    }



    export function switchRoom(_currentRoom: Room, _direction: Interfaces.IRoomExits) {
        if (_currentRoom.finished) {
            if (_direction.north) {
                let exits: Interfaces.IRoomExits = { north: false, east: false, south: true, west: false };
                sendRoom(<Interfaces.IRoom>{ coordinates: _currentRoom.neighbourN.coordinates, direction: exits, exits: _currentRoom.neighbourN.exits, roomType: _currentRoom.neighbourN.roomType, translation: _currentRoom.neighbourN.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourN, exits);
            }
            if (_direction.east) {
                let exits: Interfaces.IRoomExits = { north: false, east: false, south: false, west: true };
                sendRoom(<Interfaces.IRoom>{ coordinates: _currentRoom.neighbourE.coordinates, direction: exits, exits: _currentRoom.neighbourE.exits, roomType: _currentRoom.neighbourE.roomType, translation: _currentRoom.neighbourE.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourE, exits);
            }
            if (_direction.south) {
                let exits: Interfaces.IRoomExits = { north: true, east: false, south: false, west: false };
                sendRoom(<Interfaces.IRoom>{ coordinates: _currentRoom.neighbourS.coordinates, direction: exits, exits: _currentRoom.neighbourS.exits, roomType: _currentRoom.neighbourS.roomType, translation: _currentRoom.neighbourS.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourS, exits);
            }
            if (_direction.west) {
                let exits: Interfaces.IRoomExits = { north: false, east: true, south: false, west: false };
                sendRoom(<Interfaces.IRoom>{ coordinates: _currentRoom.neighbourW.coordinates, direction: exits, exits: _currentRoom.neighbourW.exits, roomType: _currentRoom.neighbourW.roomType, translation: _currentRoom.neighbourW.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourW, exits);
            }

            EnemySpawner.spawnMultipleEnemiesAtRoom(_currentRoom.enemyCount, _currentRoom.mtxLocal.translation.toVector2());
        }
    }

    export function addRoomToGraph(_room: Room, _direciton?: Interfaces.IRoomExits) {
        let oldObjects: Game.ƒ.Node[] = Game.graph.getChildren().filter(elem => ((<any>elem).tag != Tag.TAG.PLAYER) || ((<any>elem).tag != Tag.TAG.UI));

        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });

        Game.graph.addChild(_room);
        Game.graph.addChild(_room.walls[0]);
        Game.graph.addChild(_room.walls[1]);
        Game.graph.addChild(_room.walls[2]);
        Game.graph.addChild(_room.walls[3]);

        if (_direciton != undefined) {
            let newPosition: Game.ƒ.Vector3 = _room.cmpTransform.mtxLocal.translation.clone;

            if (_direciton != null) {
                if (_direciton.north) {
                    newPosition.y += _room.roomSize / 2 - 2;
                }
                if (_direciton.east) {
                    newPosition.x += _room.roomSize / 2 - 2;
                }
                if (_direciton.south) {
                    newPosition.y -= _room.roomSize / 2 - 2;
                }
                if (_direciton.west) {
                    newPosition.x -= _room.roomSize / 2 - 2;
                }
            }
            newPosition.z = 0;

            if (Networking.client.id == Networking.client.idHost) {
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition;
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition;
            }
        }

        if (Networking.client.id != Networking.client.idHost) {
            _room.setDoors();
        }

        for (let i = 0; i < _room.doors.length; i++) {
            Game.graph.addChild(_room.doors[i]);
        }

        if (_room.roomType == ROOMTYPE.TREASURE && Networking.client.id == Networking.client.idHost) {
            //TODO: add ExternalItems random
            let position: Game.ƒ.Vector2 = _room.mtxLocal.translation.toVector2();

            position.x -= 2;
            let randomItemId: number = Math.floor(Math.random() * (Object.keys(Items.ITEMID).length / 2 - 1));
            Game.graph.addChild(new Items.InternalItem(randomItemId, position));

            position.x += 4;
            randomItemId = Math.floor(Math.random() * (Object.keys(Items.ITEMID).length / 2 - 1));
            Game.graph.addChild(new Items.InternalItem(randomItemId, position));
        }

        Game.currentRoom = _room;
    }
}