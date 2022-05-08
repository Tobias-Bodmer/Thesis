namespace Generation {
    export enum ROOMTYPE {
        START,
        NORMAL,
        MERCHANT,
        TREASURE,
        CHALLENGE,
        BOSS
    }

    export class EnemyCountManager {
        private maxEnemyCount: number; get getMaxEnemyCount(): number { return this.maxEnemyCount };
        private currentEnemyCoount: number;
        public finished: boolean;
        constructor(_enemyCount: number) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCoount = _enemyCount;
            this.finished = false;
            if (_enemyCount <= 0) {
                this.finished = true;
            }
        }

        public onEnemyDeath() {
            this.currentEnemyCoount--;
            if (this.currentEnemyCoount <= 0) {
                this.finished = true;
            }
        }
    }
    export let txtStartRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();

    export abstract class Room extends ƒ.Node {
        public tag: Tag.TAG;
        public roomType: ROOMTYPE;
        public coordinates: Game.ƒ.Vector2;
        public walls: Wall[] = [];
        public obsticals: Obsitcal[] = [];
        public enemyCountManager: EnemyCountManager;
        public positionUpdated: boolean = false;
        roomSize: number = 30;
        exits: Interfaces.IRoomExits; // N E S W
        mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(this.mesh);
        protected avatarSpawnPointN: Game.ƒ.Vector2; get getSpawnPointN(): Game.ƒ.Vector2 { return this.avatarSpawnPointN };
        protected avatarSpawnPointE: Game.ƒ.Vector2; get getSpawnPointE(): Game.ƒ.Vector2 { return this.avatarSpawnPointE };
        protected avatarSpawnPointS: Game.ƒ.Vector2; get getSpawnPointS(): Game.ƒ.Vector2 { return this.avatarSpawnPointS };
        protected avatarSpawnPointW: Game.ƒ.Vector2; get getSpawnPointW(): Game.ƒ.Vector2 { return this.avatarSpawnPointW };

        private challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));

        cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

        constructor(_coordiantes: Game.ƒ.Vector2, _roomSize: number, _roomType: ROOMTYPE) {
            super("room");
            this.tag = Tag.TAG.ROOM;
            this.coordinates = _coordiantes;
            this.enemyCountManager = new EnemyCountManager(0);
            if (_roomSize != undefined) {
                this.roomSize = _roomSize;
            }
            if (_roomType != undefined) {
                this.roomType = _roomType;
            }
            this.exits = <Interfaces.IRoomExits>{ north: false, east: false, south: false, west: false }
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scaling = new ƒ.Vector3(this.roomSize, this.roomSize, 1);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 0, -0.01);

            this.addWalls();
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate)
        }

        protected eventUpdate = (_event: Event): void => {
            this.update();
        }

        public update(): void {

        }

        private addWalls(): void {
            this.addChild((new Wall(new ƒ.Vector2(0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, 0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(-0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, -0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));

            this.getChildren().filter(elem => (<Wall>elem).tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push((<Wall>wall));
            })
        }

        public setSpawnPoints() {
            this.avatarSpawnPointE = new ƒ.Vector2(this.mtxLocal.translation.x + ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointW = new ƒ.Vector2(this.mtxLocal.translation.x - ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointN = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y + ((this.roomSize / 2) - 2));
            this.avatarSpawnPointS = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y - ((this.roomSize / 2) - 2));
        }

        public getRoomSize(): number {
            return this.roomSize;
        }

        public setRoomExit(_neighbour: Room) {
            let dif = Game.ƒ.Vector2.DIFFERENCE(_neighbour.coordinates, this.coordinates)
            if (dif.equals(compareNorth)) {
                this.exits.north = true;
            }
            if (dif.equals(compareEast)) {
                this.exits.east = true;
            }
            if (dif.equals(compareSouth)) {
                this.exits.south = true;
            }
            if (dif.equals(compareWest)) {
                this.exits.west = true;
            }
        }

        public openDoors() {
            if (this.exits.north) {
                this.walls.find(wall => wall.door.direction.north == true).door.openDoor();
            }
            if (this.exits.east) {
                this.walls.find(wall => wall.door.direction.east == true).door.openDoor();
            }
            if (this.exits.south) {
                this.walls.find(wall => wall.door.direction.south == true).door.openDoor();
            }
            if (this.exits.west) {
                this.walls.find(wall => wall.door.direction.west == true).door.openDoor();
            }
        }

    }

    export class StartRoom extends Room {
        private startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtStartRoom));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.START);

            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }

    export class NormalRoom extends Room {
        normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.enemyCountManager = new EnemyCountManager(0);

            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }

    export class BossRoom extends Room {
        bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }
    }

    export class TreasureRoom extends Room {
        private treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        private spawnChance: number = 100; get getSpawnChance(): number { return this.spawnChance };
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
        }
    }

    export class MerchantRoom extends Room {
        private merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.MERCHANT);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.merchantRoomMat;
        }
    }

    export class Wall extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.WALL;
        public collider: Game.ƒ.Rectangle;
        public door: Door;

        constructor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2, _room: Room) {
            super("Wall");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));

            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.translation = newPos;
            this.mtxLocal.scaling = _scaling.toVector3(1);


            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                } else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                }
            } else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                } else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                }
            }
        }

        addDoor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2) {
            this.door = new Door();
            this.addChild(this.door);

            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: true, south: false, west: false });
                    this.door.mtxLocal.translateX(-0.5);
                } else {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: false, south: false, west: true });
                    this.door.mtxLocal.translateX(0.5);
                }
            } else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: true, east: false, south: false, west: false });
                    this.door.mtxLocal.translateY(-0.5);
                } else {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: false, south: true, west: false });
                    this.door.mtxLocal.translateY(0.5);
                }
            }
        }

        setCollider() {
            this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
    }

    export class Door extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.DOOR;
        public collider: Game.ƒ.Rectangle;

        public direction: Interfaces.IRoomExits;

        constructor() {
            super("Door");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("green", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));

            this.mtxLocal.translateZ(0.1);
            this.closeDoor();
        }

        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }

        public changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.direction);
            } else {
                Networking.switchRoomRequest(this.direction);
            }
        }

        public openDoor() {
            this.activate(true);
        }

        public closeDoor() {
            this.activate(false);
        }


    }

    export class Obsitcal extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.OBSTICAL;
        public collider: Collider.Collider;
        public parentRoom: Room;

        direction: Interfaces.IRoomExits;

        constructor(_parent: Room, _position: Game.ƒ.Vector2, _scale: number) {
            super("Obstical");

            this.parentRoom = _parent;
            this.parentRoom.obsticals.push(this);

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));

            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));

            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
}