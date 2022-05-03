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
        private wallOffset: number = 0.5;
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
                    this.enemyCount = 2;
                    this.roomSize = 10;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    // this.obsticals.push(new Generation.Obsitcal(this, new ƒ.Vector2(2, 2), 2));
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
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(this.roomSize, this.roomSize, 0));
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x * this.roomSize, this.coordinates.y * this.roomSize, -0.01);

            this.addWallsAndRooms();
            this.walls.forEach(wall => {
                this.addChild(wall);
            })
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate)
        }

        protected eventUpdate = (_event: Event): void => {
            this.update();
        }

        public update(): void {
            if (this.enemyCount <= 0) {
                this.finished = true;
            }
            this.walls.forEach(wall => {
                wall.update();
            })
        }

        private addWallsAndRooms(): void {
            this.walls.push(new Wall(new ƒ.Vector2(this.wallOffset, 0), new ƒ.Vector2(1 / this.roomSize, 1)));
            this.walls.push(new Wall(new ƒ.Vector2(- this.wallOffset, 0), new ƒ.Vector2(1 / this.roomSize, 1)));
            this.walls.push(new Wall(new ƒ.Vector2(0, + this.wallOffset), new ƒ.Vector2(1, 1 / this.roomSize)));
            this.walls.push(new Wall(new ƒ.Vector2(0, - this.wallOffset), new ƒ.Vector2(1, 1 / this.roomSize)));
        }

        public getRoomSize(): number {
            return this.roomSize;
        }
    }

    export class Wall extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.WALL;
        public collider: Game.ƒ.Rectangle;
        public door: Door;
        constructor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2) {
            super("Wall");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            this.mtxLocal.translation = _pos.toVector3();
            if (_pos.x > 0) {
                this.mtxLocal.rotateZ(180);
            }
            this.mtxLocal.scaling = _scaling.toVector3();
            this.door = new Door(this.mtxLocal.translation.toVector2())
            this.addChild(this.door);
        }

        update() {
            this.collider = new ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, 1);
        }
    }

    export class Door extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.DOOR;
        public collider: Game.ƒ.Rectangle;
        private offsetX: number = 3;

        direction: Interfaces.IRoomExits;

        constructor(_position: Game.ƒ.Vector2) {
            super("Door");


            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("green", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));

            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);


            // this.cmpTransform.mtxLocal.translation.x += this.offsetX;
            // this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, -0.1);
            // this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }



        // public changeRoom() {
        //     if (Networking.client.id == Networking.client.idHost) {
        //         Generation.switchRoom(this.parentRoom, this.direction);
        //     } else {
        //         Networking.switchRoomRequest(this.parentRoom.coordinates, this.direction);
        //     }
        // }
    }

    export class Obsitcal extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.OBSTICAL;
        public collider: Collider.Collider;
        public parentRoom: Room;

        direction: Interfaces.IRoomExits;

        constructor(_parent: Room, _position: Game.ƒ.Vector2, _scale: number) {
            super("Obstical");

            this.parentRoom = _parent;

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));

            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));

            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
}