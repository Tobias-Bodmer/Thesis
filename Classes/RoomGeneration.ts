namespace Generation {

    let numberOfRooms: number = 5;
    export let rooms: Room[] = [];

    export const compareNorth: Game.ƒ.Vector2 = new ƒ.Vector2(0, 1);
    export const compareEast: Game.ƒ.Vector2 = new ƒ.Vector2(1, 0);
    export const compareSouth: Game.ƒ.Vector2 = new ƒ.Vector2(0, -1);
    export const compareWest: Game.ƒ.Vector2 = new ƒ.Vector2(-1, 0);

    //spawn chances
    let challengeRoomSpawnChance: number = 30;
    let treasureRoomSpawnChance: number = 100;

    export function procedualRoomGeneration() {
        rooms = generateNormalRooms();
        addBossRoom();
        setExits();
        addRoomToGraph(rooms[0]);
    }

    function generateSnakeGrid(): Game.ƒ.Vector2[] {
        let grid: Game.ƒ.Vector2[] = [];
        grid.push(new ƒ.Vector2(0, 0));
        for (let i = 0; i < numberOfRooms; i++) {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(grid, grid[grid.length - 1]);
            if (nextCoord == undefined) {
                break;
            } else {
                grid.push(nextCoord);
            }
        }
        // console.log("room grid: " + grid + " " + (grid.length - 1));
        return grid;
    }

    function getNextPossibleCoordFromSpecificCoord(_grid: Game.ƒ.Vector2[], _specificCoord: Game.ƒ.Vector2) {
        let coordNeighbours: Game.ƒ.Vector2[] = getNeighbourCoordinate(_specificCoord);
        for (let i = 0; i < coordNeighbours.length; i++) {
            let randomIndex = Math.round(Math.random() * (coordNeighbours.length - 1));
            let nextCoord = coordNeighbours[randomIndex];
            if (_grid.find(coord => coord.equals(nextCoord))) {
                coordNeighbours = coordNeighbours.filter(coord => !coord.equals(nextCoord));
                continue;
            }
            else {
                return nextCoord;
            }
        }
        return null;
    }

    function getNeighbourCoordinate(_coord: Game.ƒ.Vector2): Game.ƒ.Vector2[] {
        let neighbours: Game.ƒ.Vector2[] = [];
        neighbours.push(new ƒ.Vector2(_coord.x + 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x - 1, _coord.y));

        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y + 1));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y - 1));
        return neighbours;
    }

    function generateNormalRooms(): NormalRoom[] {
        let gridCoords: Game.ƒ.Vector2[];
        let rooms: NormalRoom[] = [];
        while (true) {
            gridCoords = generateSnakeGrid();
            if ((gridCoords.length - 1) == numberOfRooms) {
                break;
            }
        }
        gridCoords.forEach(coord => {
            rooms.push(new NormalRoom(coord));
        })
        return rooms;
    }

    function addBossRoom() {
        let biggestDistance: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
        rooms.forEach(room => {
            if (Math.abs(room.coordinates.x) > biggestDistance.x && Math.abs(room.coordinates.y) > biggestDistance.y) {
                biggestDistance = room.coordinates;
            }
        })
        let roomCoord: Game.ƒ.Vector2[] = getCoordsFromRooms();
        let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 1]);
        if (nextCoord == undefined) {
            //TODO: restart whole process
            nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 2]);
        }
        else {
            rooms.push(new BossRoom(nextCoord));
        }
    }

    function addTreasureRoom(_rooms: Room[]) {
        let roomCoords: Game.ƒ.Vector2[] = [];

        _rooms.forEach(room => {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoords, room.coordinates)
        })
    }

    export function getCoordsFromRooms(): Game.ƒ.Vector2[] {
        let coords: Game.ƒ.Vector2[] = [];
        rooms.forEach(room => {
            coords.push(room.coordinates);
        })
        return coords
    }

    function setExits() {
        rooms.forEach(room => {
            let neighbours = rooms.filter(element => element != room);
            neighbours.forEach(neighbour => {
                room.setRoomExit(neighbour);
                room.setSpawnPoints();
                room.openDoors();
            })
        })
    }

    function isSpawning(_spawnChance: number): boolean {
        let x = Math.random() * 100;
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }

    function moveRoomToWorldCoords() {
        
    }

    // function placeRoomToWorlCoords(_firstRoom: Room) {
    //     if (_firstRoom.neighbourN != undefined && !_firstRoom.neighbourN.positionUpdated) {
    //         _firstRoom.neighbourN.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), _firstRoom.neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), -0.01);
    //         _firstRoom.neighbourN.positionUpdated = true;
    //         placeRoomToWorlCoords(_firstRoom.neighbourN);
    //     }
    //     if (_firstRoom.neighbourE != undefined && !_firstRoom.neighbourE.positionUpdated) {
    //         _firstRoom.neighbourE.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), _firstRoom.neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), -0.01);
    //         _firstRoom.neighbourE.positionUpdated = true;
    //         placeRoomToWorlCoords(_firstRoom.neighbourE);
    //     }
    //     if (_firstRoom.neighbourS != undefined && !_firstRoom.neighbourS.positionUpdated) {
    //         _firstRoom.neighbourS.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), _firstRoom.neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), -0.01);
    //         _firstRoom.neighbourS.positionUpdated = true;
    //         placeRoomToWorlCoords(_firstRoom.neighbourS);
    //     }
    //     if (_firstRoom.neighbourW != undefined && !_firstRoom.neighbourW.positionUpdated) {
    //         _firstRoom.neighbourW.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), _firstRoom.neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), -0.01);
    //         _firstRoom.neighbourW.positionUpdated = true;
    //         placeRoomToWorlCoords(_firstRoom.neighbourW);
    //     }
    // }
    export function switchRoom(_direction: Interfaces.IRoomExits) {
        if (Game.currentRoom.finished) {
            let newRoom: Room;
            let newPosition: Game.ƒ.Vector2
            if (_direction.north) {
                newRoom = rooms.find(room => room.coordinates.equals(ƒ.Vector2.SUM(compareNorth, Game.currentRoom.coordinates)));
                newPosition = newRoom.getSpawnPointS;
            }
            if (_direction.east) {
                newRoom = rooms.find(room => room.coordinates.equals(ƒ.Vector2.SUM(compareEast, Game.currentRoom.coordinates)));
                newPosition = newRoom.getSpawnPointW;

            }
            if (_direction.south) {
                newRoom = rooms.find(room => room.coordinates.equals(ƒ.Vector2.SUM(compareSouth, Game.currentRoom.coordinates)));
                newPosition = newRoom.getSpawnPointN;
            }
            if (_direction.west) {
                newRoom = rooms.find(room => room.coordinates.equals(ƒ.Vector2.SUM(compareWest, Game.currentRoom.coordinates)));
                newPosition = newRoom.getSpawnPointE;
            }
            if (newRoom == undefined) {
                console.error("no room found");
                return;
            }

            if (Networking.client.id == Networking.client.idHost) {
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition.toVector3();
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition.toVector3();
            }

            addRoomToGraph(newRoom);
            EnemySpawner.spawnMultipleEnemiesAtRoom(Game.currentRoom.enemyCount, Game.currentRoom.mtxLocal.translation.toVector2());
        }
    }

    export function addRoomToGraph(_room: Room) {
        let oldObjects: Game.ƒ.Node[] = Game.graph.getChildren().filter(elem => ((<any>elem).tag != Tag.TAG.PLAYER));
        oldObjects = oldObjects.filter(elem => ((<any>elem).tag != Tag.TAG.UI));

        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });

        Game.graph.addChild(_room);

        Game.viewport.calculateTransforms();

        _room.walls.forEach(wall => {
            wall.setCollider();
            if (wall.door != undefined) {
                wall.door.setCollider();
            }
        })

        Networking.sendRoom(<Interfaces.IRoom>{ coordinates: _room.coordinates, exits: _room.exits, roomType: _room.roomType, translation: _room.mtxLocal.translation });

        Game.currentRoom = _room;
    }
}