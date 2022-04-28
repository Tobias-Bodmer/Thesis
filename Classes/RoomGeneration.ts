namespace Generation {

    let numberOfRooms: number = 3;
    let usedPositions: Game.ƒ.Vector2[] = [];
    export let rooms: Room[] = [];

    //spawn chances
    let challengeRoomSpawnChance: number = 30;
    let treasureRoomSpawnChance: number = 100;

    export function generateRooms(): void {
        let startCoords: Game.ƒ.Vector2 = Game.ƒ.Vector2.ZERO();

        rooms.push(new Room("roomStart", startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START))
        usedPositions.push(startCoords);

        for (let i: number = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(rooms[rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        rooms.forEach(room => {
            room.exits = calcRoomDoors(room);
            // console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        })

        for (let i = 0; i < rooms.length; i++) {
            rooms[i].setDoors();
        }

        Game.graph.addChild(rooms[0]);
        Game.graph.appendChild(rooms[0].walls[0]);
        Game.graph.appendChild(rooms[0].walls[1]);
        Game.graph.appendChild(rooms[0].walls[2]);
        Game.graph.appendChild(rooms[0].walls[3]);

        for (let i = 0; i < rooms[0].doors.length; i++) {
            Game.graph.addChild(rooms[0].doors[i]);
        }

        sendRoom(rooms[0]);
    }

    function sendRoom(_room: Room, _direciton?: Interfaces.RoomExits) {
        Networking.sendRoom(_room.name, _room.coordinates, _room.exits, _room.roomType, _direciton);
    }

    function addRoom(_currentRoom: Room, _roomType: Generation.ROOMTYPE): void {
        let numberOfExits: number = countBool(_currentRoom.exits);
        let randomNumber: number = Math.round(Math.random() * (numberOfExits - 1));
        let possibleExitIndex: number[] = getExitIndex(_currentRoom.exits);
        console.log(_roomType + ": " + possibleExitIndex + "____ " + randomNumber);
        let newRoomPosition: Game.ƒ.Vector2;
        let newRoom: Room;

        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y + 1);
                newRoom = new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourN = newRoom;
                newRoom.neighbourS = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x + 1, _currentRoom.coordinates.y);
                newRoom = new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourE = newRoom;
                newRoom.neighbourW = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y - 1);
                newRoom = new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourS = newRoom;
                newRoom.neighbourN = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x - 1, _currentRoom.coordinates.y);
                newRoom = new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourW = newRoom;
                newRoom.neighbourE = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
                
            }
            // _currentRoom.setRoomCoordinates();
            
        }

    function addSpecialRooms(): void {
        rooms.forEach(room => {
            room.exits = calcPathExits(room.coordinates);
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


    function countBool(_exits: Interfaces.RoomExits): number {
        let counter: number = 0;
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


    function getExitIndex(_exits: Interfaces.RoomExits): number[] {
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
    /**
     * calculates possible exits for new rooms
     * @param _position position of room
     * @returns boolean for each direction north, east, south, west
     */

    function calcPathExits(_position: Game.ƒ.Vector2): Interfaces.RoomExits {
        let exits: Interfaces.RoomExits = { north: false, east: false, south: false, west: false };
        let roomNeighbours: Game.ƒ.Vector2[];
        roomNeighbours = sliceNeighbours(getNeighbours(_position));
        for (let i = 0; i < roomNeighbours.length; i++) {
            if (roomNeighbours[i].y - _position.y == -1) {
                exits.south = true;
            }
            if (roomNeighbours[i].x - _position.x == -1) {
                exits.west = true;
            }
            if (roomNeighbours[i].y - _position.y == 1) {
                exits.north = true;
            }
            if (roomNeighbours[i].x - _position.x == 1) {
                exits.east = true;
            }
        }
        return exits;
    }

    function calcRoomDoors(_room: Generation.Room): Interfaces.RoomExits {
        let exits: Interfaces.RoomExits = { north: false, east: false, south: false, west: false };
        if (_room.neighbourN != undefined) {
            exits.north = true;
        }
        if (_room.neighbourE != undefined) {
            exits.east = true;
        }
        if (_room.neighbourS != undefined) {
            exits.south = true;
        }
        if (_room.neighbourW != undefined) {
            exits.west = true;
        }
        return exits;
    }


    function getNeighbours(_position: Game.ƒ.Vector2): Game.ƒ.Vector2[] {
        let neighbours: Game.ƒ.Vector2[] = []
        neighbours.push(new Game.ƒ.Vector2(_position.x, _position.y - 1)); // down
        neighbours.push(new Game.ƒ.Vector2(_position.x - 1, _position.y)); // left
        neighbours.push(new Game.ƒ.Vector2(_position.x, _position.y + 1)); // up
        neighbours.push(new Game.ƒ.Vector2(_position.x + 1, _position.y)); // right
        return neighbours;
    }

    function sliceNeighbours(_neighbours: Game.ƒ.Vector2[]): Game.ƒ.Vector2[] {
        let neighbours = _neighbours;
        let toRemoveIndex: number[] = [];
        for (let i = 0; i < neighbours.length; i++) {
            // check ich position already used
            usedPositions.forEach(room => {
                if (neighbours[i].x == room.x && neighbours[i].y == room.y) {
                    toRemoveIndex.push(i);
                }
            })
        }
        let copy: Game.ƒ.Vector2[] = [];
        toRemoveIndex.forEach(index => {
            delete neighbours[index];
        });
        neighbours.forEach(n => {
            copy.push(n);
        });
        return copy;
    }

    export function switchRoom(_currentRoom: Room, _direction: Interfaces.RoomExits) {
        if (_currentRoom.finished) {
            if (_direction.north) {
                let exits: Interfaces.RoomExits = { north: false, east: false, south: true, west: false };
                sendRoom(_currentRoom.neighbourN, exits);
                addRoomToGraph(_currentRoom.neighbourN, exits);
            }
            if (_direction.east) {
                let exits: Interfaces.RoomExits = { north: false, east: false, south: false, west: true };
                sendRoom(_currentRoom.neighbourE, exits);
                addRoomToGraph(_currentRoom.neighbourE, exits);
            }
            if (_direction.south) {
                let exits: Interfaces.RoomExits = { north: true, east: false, south: false, west: false };
                sendRoom(_currentRoom.neighbourS, exits);
                addRoomToGraph(_currentRoom.neighbourS, exits);
            }
            if (_direction.west) {
                let exits: Interfaces.RoomExits = { north: false, east: true, south: false, west: false };
                sendRoom(_currentRoom.neighbourW, exits);
                addRoomToGraph(_currentRoom.neighbourW, exits);
            }

            EnemySpawner.spawnEnemies();
        }
    }

    export function addRoomToGraph(_room: Room, _direciton?: Interfaces.RoomExits) {
        let oldObjects: Game.ƒ.Node[] = Game.graph.getChildren().filter(elem => (<any>elem).tag != Tag.TAG.PLAYER);

        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });

        Game.graph.addChild(_room);
        Game.graph.addChild(_room.walls[0]);
        Game.graph.addChild(_room.walls[1]);
        Game.graph.addChild(_room.walls[2]);
        Game.graph.addChild(_room.walls[3]);

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

        Game.avatar1.cmpTransform.mtxLocal.translation = newPosition;
        if (Networking.client.id == Networking.client.idHost) {
            Game.avatar2.cmpTransform.mtxLocal.translation = newPosition;
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
    }
}