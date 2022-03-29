namespace Generation {

    let maxX: number = 5;
    let maxY: number = 5;
    let roomCount: number = 5;
    let grid: [number, number][] = [];
    let usedGrid: [number, number][] = [];
    let rooms: Room[] = [];
    export function generateGrid(): void {
        for (let i = 0; i < maxX; i++) {
            for (let j = 0; j < maxY; j++) {
                grid.push([i, j]);
            }
        }
        generateRooms();
    }

    function generateRooms() {
        let midX = Math.floor((maxX - 1) / 2);
        let startCoords: [number, number] = [midX, 0];
        rooms.push(new Room(startCoords, calcExits(startCoords), Generation.ROOMTYPE.NORMAL))
        usedGrid.push(startCoords);
        console.log("rooms: " + rooms[0].exits[0]);
        addRoom(rooms[0]);
    }

    function addRoom(_currentRoom: Room) {
        let numberOfExits: number = countBool(_currentRoom.exits);
        let exitIndex: number[] = getExitIndex(_currentRoom.exits);
        console.log(exitIndex);

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

    function calcExits(_position: [number, number]): [boolean, boolean, boolean, boolean] {
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
        let newNeighbours = neighbours;
        for (let i = 0; i < neighbours.length; i++) {
            if (neighbours[i][0] < 0 || neighbours[i][1] < 0 || neighbours[i][0] > maxX || neighbours[i][1] > maxY) {
                delete newNeighbours[i];
            }
            usedGrid.forEach(room => {
                if (neighbours[i][0] == room[0] && neighbours[i][1] == room[1]) {
                    delete newNeighbours[i];
                }
            })
        }
        let copy: [number, number][] = [];
        newNeighbours.forEach(n => {
            copy.push(n);
        })
        return copy;
    }
}