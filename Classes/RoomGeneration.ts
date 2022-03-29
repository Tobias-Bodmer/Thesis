namespace Generation {

    let maxX: number = 9;
    let maxY: number = 9;
    let numberOfRooms: number = 2;
    let usedPositions: [number, number][] = [];
    let rooms: Room[] = [];
    export function generateGrid(): void {
        generateRooms();
    }

    function generateRooms() {
        let midX = Math.floor((maxX - 1) / 2);
        let midY = Math.floor((maxY - 1) / 2);
        let startCoords: [number, number] = [midX, midY];

        rooms.push(new Room(startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START))
        usedPositions.push(startCoords);

        for (let i = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        rooms.forEach(room => {
            console.log(room.coordinates + " " + room.exits);
            room.exits = calcRoomDoors(room.coordinates);
        })
        rooms.forEach(room => {
            console.log("calced: " + room.coordinates + " " + room.exits);
        })

    }

    function addRoom(_currentRoom: Room, _roomType: Generation.ROOMTYPE) {
        let numberOfExits: number = countBool(_currentRoom.exits);
        let randomNumber: number = Math.floor(Math.random() * numberOfExits);
        let possibleExitIndex: number[] = getExitIndex(_currentRoom.exits);
        let newRoomPosition: [number, number];

        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                rooms.push(new Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                rooms.push(new Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                rooms.push(new Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                rooms.push(new Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;

        }

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
            if (neighbours[i][0] < 0 || neighbours[i][1] < 0 || neighbours[i][0] > maxX || neighbours[i][1] > maxY) {
                toRemoveIndex.push(i);
            }
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