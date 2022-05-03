namespace Generation {
    export enum ROOMTYPE {
        START,
        NORMAL,
        MERCHANT,
        TREASURE,
        CHALLENGE,
        BOSS
    }

    export let txtStartRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();

    export class Room extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.ROOM;
        public roomType: ROOMTYPE
        public coordinates: Game.ƒ.Vector2;
        public walls: Wall[] = [];
        public obsticals: Obsitcal[] = [];
        public finished: boolean = false;
        public enemyCount: number;
        public positionUpdated: boolean = false;
        neighbourN: Room;
        neighbourE: Room;
        neighbourS: Room;
        neighbourW: Room;
        roomSize: number = 30;
        exits: Interfaces.IRoomExits; // N E S W
        mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtStartRoom));
        normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));


        cmpMaterial: ƒ.ComponentMaterial;


        constructor(_name: string, _coordiantes: Game.ƒ.Vector2, _exits: Interfaces.IRoomExits, _roomType: ROOMTYPE) {
            super(_name);
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;

            switch (_roomType) {
                case ROOMTYPE.START:
                    this.enemyCount = 0;
                    this.roomSize = 15;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case ROOMTYPE.NORMAL:
                    this.enemyCount = Math.round(Math.random() * 10) + 20;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case ROOMTYPE.MERCHANT:
                    this.enemyCount = 0;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case ROOMTYPE.TREASURE:
                    this.enemyCount = 0;
                    this.roomSize = 8;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case ROOMTYPE.CHALLENGE:
                    this.enemyCount = Math.round(Math.random() * 20) + 30;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case ROOMTYPE.BOSS:
                    this.enemyCount = 0;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.bossRoomMat);
                    break;
            }

            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(this.roomSize, this.roomSize, 1));
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x * this.roomSize, this.coordinates.y * this.roomSize, -0.01);

            this.addWallsAndRooms();

            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate)
        }

        protected eventUpdate = (_event: Event): void => {
            this.update();
        }

        public update(): void {
            if (this.enemyCount <= 0) {
                this.finished = true;
            }
        }

        private addWallsAndRooms(): void {
            this.addChild((new Wall(new ƒ.Vector2(0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, 0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(-0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, -0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));

            this.getChildren().filter(elem => (<Wall>elem).tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push((<Wall>wall));
            })
        }

        public getRoomSize(): number {
            return this.roomSize;
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
                if (_pos.x > 0 && _room.exits.east) {
                    this.setDoor(_pos, _scaling);
                } else if (_pos.x < 0 && _room.exits.west) {
                    this.setDoor(_pos, _scaling);
                }
            } else {
                if (_pos.y > 0 && _room.exits.north) {
                    this.setDoor(_pos, _scaling);
                } else if (_pos.y < 0 && _room.exits.south) {
                    this.setDoor(_pos, _scaling);
                }
            }
        }

        setDoor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2) {
            this.door = new Door();
            this.addChild(this.door);

            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.nextRoom = (<Interfaces.IRoomExits>{ north: false, east: true, south: false, west: false });
                    this.door.mtxLocal.translateX(-0.5);
                } else {
                    this.door.nextRoom = (<Interfaces.IRoomExits>{ north: false, east: false, south: false, west: true });
                    this.door.mtxLocal.translateX(0.5);
                }
            } else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.nextRoom = (<Interfaces.IRoomExits>{ north: true, east: false, south: false, west: false });
                    this.door.mtxLocal.translateY(-0.5);
                } else {
                    this.door.nextRoom = (<Interfaces.IRoomExits>{ north: false, east: false, south: true, west: false });
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


        public nextRoom: Interfaces.IRoomExits;

        constructor() {
            super("Door");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("green", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));

            this.mtxLocal.translateZ(0.1);
        }

        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }



        public changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.nextRoom);
            } else {
                Networking.switchRoomRequest(this.nextRoom);
            }
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