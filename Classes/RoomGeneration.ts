namespace Generation {

    let numberOfRooms: number = 5;
    export let generationFailed = false;
    export let rooms: Room[] = [];

    export const compareNorth: Game.ƒ.Vector2 = new ƒ.Vector2(0, 1);
    export const compareEast: Game.ƒ.Vector2 = new ƒ.Vector2(1, 0);
    export const compareSouth: Game.ƒ.Vector2 = new ƒ.Vector2(0, -1);
    export const compareWest: Game.ƒ.Vector2 = new ƒ.Vector2(-1, 0);

    export function procedualRoomGeneration() {
        rooms = [];
        generationFailed = false;
        rooms.push(generateStartRoom());
        rooms.push.apply(rooms, generateNormalRooms());
        addBossRoom();
        rooms.push.apply(rooms, generateTreasureRoom());
        rooms.push(generateMerchantRoom());
        rooms.push(generateChallengeRoom());
        setExits();
        rooms.forEach(room => { console.log(room.mtxLocal.translation.clone.toString()) });
        moveRoomToWorldCoords(rooms[0]);

        setExits();
        startLevel();
        Game.setMiniMap();
    }
    /**
     * generates a grid thats connected toggether from a given starting point
     * @param _startCoord the starting point
     * @returns vector2 array of a connecting grid without overlaps
     */
    function generateSnakeGrid(_startCoord: Game.ƒ.Vector2): Game.ƒ.Vector2[] {
        let grid: Game.ƒ.Vector2[] = [];
        grid.push(_startCoord);
        for (let i = 0; i < numberOfRooms; i++) {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(grid, grid[grid.length - 1]);
            if (nextCoord == undefined) {
                break;
            } else {
                grid.push(nextCoord);
            }
        }
        return grid;
    }
    /**
     * function to get a random neigihbour taking care of an acutal grid
     * @param _grid existing grid the function should care about
     * @param _specificCoord the coord you want the next possible coord 
     * @returns a vector2 coord thats not inside of _grid and around  _specificCoord
     */
    function getNextPossibleCoordFromSpecificCoord(_grid: Game.ƒ.Vector2[], _specificCoord: Game.ƒ.Vector2): Game.ƒ.Vector2 {
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
    /**
     * function to get all neighbours ignoring the current grid
     * @param _coord coordiante you want the neighbour from
     * @returns 4 neighbours in direction N E S and W
     */
    function getNeighbourCoordinate(_coord: Game.ƒ.Vector2): Game.ƒ.Vector2[] {
        let neighbours: Game.ƒ.Vector2[] = [];
        neighbours.push(new ƒ.Vector2(_coord.x + 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x - 1, _coord.y));

        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y + 1));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y - 1));
        return neighbours;
    }

    function generateStartRoom(): StartRoom {
        let startRoom: StartRoom = new StartRoom(new ƒ.Vector2(0, 0), 30);
        return startRoom;
    }

    function generateNormalRooms(): NormalRoom[] {
        let gridCoords: Game.ƒ.Vector2[];
        let normalRooms: NormalRoom[] = [];
        while (true) {
            gridCoords = generateSnakeGrid(rooms[0].coordinates);
            if ((gridCoords.length - 1) == numberOfRooms) {
                break;
            }
        }
        gridCoords.forEach(coord => {
            normalRooms.push(new NormalRoom(coord, 20));
        })
        return normalRooms;
    }

    function addBossRoom() {
        let biggestDistance: Game.ƒ.Vector2 = ƒ.Vector2.ZERO();
        rooms.forEach(room => {
            if (Math.abs(room.coordinates.x) > biggestDistance.x && Math.abs(room.coordinates.y) > biggestDistance.y) {
                biggestDistance = room.coordinates;
            }
        })
        let roomCoord: Game.ƒ.Vector2[] = getCoordsFromRooms();
        let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[0]);

        if (nextCoord == undefined) {
            generationFailed = true;
        }
        else {
            rooms.push(new BossRoom(nextCoord, 30));
        }
    }

    function generateTreasureRoom(): TreasureRoom[] {
        let roomCoords: Game.ƒ.Vector2[] = getCoordsFromRooms();
        let newTreasureRooms: TreasureRoom[] = []
        rooms.forEach(room => {
            if (room.roomType == ROOMTYPE.NORMAL) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoords, room.coordinates)
                if (nextCoord != undefined) {
                    let trRoom = new TreasureRoom(nextCoord, 10);
                    if (isSpawning(trRoom.getSpawnChance)) {
                        newTreasureRooms.push(trRoom);
                    }
                }
            }
        })
        return newTreasureRooms;
    }

    function generateMerchantRoom(): MerchantRoom {
        for (let i = 0; i < rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), rooms[i].coordinates)
                if (nextCoord != undefined) {
                    return new MerchantRoom(nextCoord, 20);
                }
            }
        }
        generationFailed = true;
        return null;
    }

    function generateChallengeRoom(): ChallengeRoom {
        for (let i = 0; i < rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), rooms[i].coordinates)
                if (nextCoord != undefined) {
                    return new ChallengeRoom(nextCoord, 20);
                }
            }
        }
        generationFailed = true;
        return null;
    }
    /**
     * function to get coordiantes from all existing rooms
     * @returns Vector2 array with coordinates of all current existing rooms in RoomGeneration.rooms
     */
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
        let x = Math.round(Math.random() * 100);
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }

    function moveRoomToWorldCoords(_firstRoom: Room) {
        let neighbourN: Room = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y + 1))));
        let neighbourE: Room = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x + 1), _firstRoom.coordinates.clone.y)));
        let neighbourS: Room = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y - 1))));
        let neighbourW: Room = rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x - 1), _firstRoom.coordinates.clone.y)));
        if (neighbourN != undefined && !neighbourN.positionUpdated) {
            neighbourN.mtxLocal.translation = new ƒ.Vector3(neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), -0.01);
            neighbourN.positionUpdated = true;
            moveRoomToWorldCoords(neighbourN);
        }
        if (neighbourE != undefined && !neighbourE.positionUpdated) {
            neighbourE.mtxLocal.translation = new ƒ.Vector3(neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), -0.01);
            neighbourE.positionUpdated = true;
            moveRoomToWorldCoords(neighbourE);
        }
        if (neighbourS != undefined && !neighbourS.positionUpdated) {
            neighbourS.mtxLocal.translation = new ƒ.Vector3(neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), -0.01);
            neighbourS.positionUpdated = true;
            moveRoomToWorldCoords(neighbourS);
        }
        if (neighbourW != undefined && !neighbourW.positionUpdated) {
            neighbourW.mtxLocal.translation = new ƒ.Vector3(neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), -0.01);
            neighbourW.positionUpdated = true;
            moveRoomToWorldCoords(neighbourW);
        }
    }

    export function switchRoom(_direction: Interfaces.IRoomExits) {
        if (Game.currentRoom.enemyCountManager.finished) {
            let newRoom: Room;
            let newPosition: Game.ƒ.Vector2
            if (_direction.north) {
                newRoom = rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y + 1)));
                newPosition = newRoom.getSpawnPointS;
            }
            if (_direction.east) {
                newRoom = rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x + 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointW;

            }
            if (_direction.south) {
                newRoom = rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y - 1)));
                newPosition = newRoom.getSpawnPointN;
            }
            if (_direction.west) {
                newRoom = rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x - 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointE;
            }
            if (newRoom == undefined) {
                console.error("no room found");
                return;
            }

            addRoomToGraph(newRoom);

            if (Networking.client.id == Networking.client.idHost) {
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition.toVector3();
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition.toVector3();
            }
        }
    }

    function startLevel() {
        let newPosition: Game.ƒ.Vector2 = new Game.ƒ.Vector2(0, 0);

        if (Game.avatar2 != undefined && Networking.client.id == Networking.client.idHost) {
            Game.avatar1.mtxLocal.translation = newPosition.toVector3();
            Game.avatar2.mtxLocal.translation = newPosition.toVector3();
        }

        addRoomToGraph(rooms[0]);
    }
    /**
     * removes erything unreliable from the graph and adds the new room to the graph , sending it to the client & spawns enemies if existing in room
     * @param _room the room it should spawn
     */
    export function addRoomToGraph(_room: Room) {
        Networking.sendRoom(<Interfaces.IRoom>{ coordinates: _room.coordinates, roomSize: _room.roomSize, exits: _room.exits, roomType: _room.roomType, translation: _room.mtxLocal.translation });

        let oldObjects: Game.ƒ.Node[] = Game.graph.getChildren().filter(elem => ((<any>elem).tag != Tag.TAG.PLAYER));
        oldObjects = oldObjects.filter(elem => ((<any>elem).tag != Tag.TAG.UI));

        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });

        Game.graph.addChild(_room);
        Game.viewport.calculateTransforms();
        if (Networking.client.id == Networking.client.idHost) {
            _room.onAddToGraph();
        }

        _room.walls.forEach(wall => {
            wall.setCollider();
            if (wall.door != undefined) {
                wall.door.setCollider();
            }
        })

        Game.currentRoom = _room;
        EnemySpawner.spawnMultipleEnemiesAtRoom(Game.currentRoom.enemyCountManager.getMaxEnemyCount, Game.currentRoom.mtxLocal.translation.toVector2());
    }
}