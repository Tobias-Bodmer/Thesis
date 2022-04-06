namespace Generation {

    let numberOfRooms: number = 3;
    let usedPositions: [number, number][] = [];
    let rooms: Room[] = [];

    //spawn chances
    let challengeRoomSpawnChance: number = 20;
    let treasureRoomSpawnChance: number = 10;

    export function generateRooms(): void {
        let startCoords: [number, number] = [0, 0];

        rooms.push(new Room("roomStart", startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START))
        usedPositions.push(startCoords);

        for (let i: number = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(rooms[rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        rooms.forEach(room => {
            room.exits = calcRoomDoors(room.coordinates);
            // console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        })

        Game.graph.addChild(rooms[0]);
        Game.graph.appendChild(rooms[0].walls[0]);
        Game.graph.appendChild(rooms[0].walls[1]);
        Game.graph.appendChild(rooms[0].walls[2]);
        Game.graph.appendChild(rooms[0].walls[3]);
    }

    function addRoom(_currentRoom: Room, _roomType: Generation.ROOMTYPE): void {
        let numberOfExits: number = countBool(_currentRoom.exits);
        let randomNumber: number = Math.floor(Math.random() * numberOfExits);
        let possibleExitIndex: number[] = getExitIndex(_currentRoom.exits);
        let newRoomPosition: [number, number];

        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                rooms.push(new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                rooms.push(new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                rooms.push(new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                rooms.push(new Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;

        }

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


    function countBool(_bool: [boolean, boolean, boolean, boolean]): number {
        let counter: number = 0;
        _bool.forEach(bool => {
            if (bool) {
                counter++;
            }
        });
        return counter;
    }

    function getExitIndex(_exits: [boolean, boolean, boolean, boolean]): number[] {
        let numbers: number[] = [];
        for (let i = 0; i < _exits.length; i++) {
            if (_exits[i]) {
                numbers.push(i)
            }
        }
        return numbers;

    }
    /**
     * calculates possible exits for new rooms
     * @param _position position of room
     * @returns boolean for each direction north, east, south, west
     */

    function calcPathExits(_position: [number, number]): [boolean, boolean, boolean, boolean] {
        let north: boolean = false;
        let east: boolean = false;
        let south: boolean = false;
        let west: boolean = false;
        let roomNeighbours: [number, number][];
        roomNeighbours = sliceNeighbours(getNeighbours(_position));
        for (let i = 0; i < roomNeighbours.length; i++) {
            if (roomNeighbours[i][1] - _position[1] == -1) {
                south = true;
            }
            if (roomNeighbours[i][0] - _position[0] == -1) {
                west = true;
            }
            if (roomNeighbours[i][1] - _position[1] == 1) {
                north = true;
            }
            if (roomNeighbours[i][0] - _position[0] == 1) {
                east = true;
            }
        }
        return [north, east, south, west];
    }

    function calcRoomDoors(_position: [number, number]): [boolean, boolean, boolean, boolean] {
        let north: boolean = false;
        let east: boolean = false;
        let south: boolean = false;
        let west: boolean = false;

        for (let i = 0; i < usedPositions.length; i++) {
            // console.log(usedPositions[i][0] - _position[1]);
            if (usedPositions[i][1] - _position[1] == -1 && usedPositions[i][0] - _position[0] == 0) {
                south = true;
            }
            if (usedPositions[i][0] - _position[0] == -1 && usedPositions[i][1] - _position[1] == 0) {
                west = true;
            }
            if (usedPositions[i][1] - _position[1] == 1 && usedPositions[i][0] - _position[0] == 0) {
                north = true;
            }
            if (usedPositions[i][0] - _position[0] == 1 && usedPositions[i][1] - _position[1] == 0) {
                east = true;
            }
        }
        return [north, east, south, west];
    }


    function getNeighbours(_position: [number, number]): [number, number][] {
        let neighbours: [number, number][] = []
        neighbours.push([_position[0], _position[1] - 1]); // down
        neighbours.push([_position[0] - 1, _position[1]]); // left
        neighbours.push([_position[0], _position[1] + 1]); // up
        neighbours.push([_position[0] + 1, _position[1]]); // right
        return neighbours;
    }

    function sliceNeighbours(_neighbours: [number, number][]): [number, number][] {
        let neighbours = _neighbours;
        let toRemoveIndex: number[] = [];
        for (let i = 0; i < neighbours.length; i++) {
            // check ich position already used
            usedPositions.forEach(room => {
                if (neighbours[i][0] == room[0] && neighbours[i][1] == room[1]) {
                    toRemoveIndex.push(i);
                }
            })
        }
        let copy: [number, number][] = [];
        toRemoveIndex.forEach(index => {
            delete neighbours[index];
        });
        neighbours.forEach(n => {
            copy.push(n);
        });
        return copy;
    }
}