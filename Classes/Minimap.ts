namespace UI {
    export class Minimap extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.PLAYER;
        private allCoordinates: Game.ƒ.Vector2[] = [];
        private roomMinimapsize: number = 0.5;
        private miniRooms: MiniRoom[] = [];
        public offsetX: number = 11;
        public offsetY: number = 6;
        private currentRoom: Generation.Room;
        private pointer: Game.ƒ.Node;

        constructor(_coordinates: Game.ƒ.Vector2[], _minimapInfo?: Interfaces.IMinimapInfos[]) {
            super("Minimap");
            if (_coordinates != null && _minimapInfo == null) {
                this.allCoordinates = _coordinates;
            } else {
                _minimapInfo.forEach(info => {
                    this.allCoordinates.push(info.coords);
                });
            }

            this.pointer = new Game.ƒ.Node("pointer");
            this.pointer.addComponent(new ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.pointer.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")))));
            this.pointer.addComponent(new ƒ.ComponentTransform());
            this.pointer.mtxLocal.scale(Game.ƒ.Vector3.ONE(this.roomMinimapsize / 2));
            this.pointer.mtxLocal.translateZ(10);

            //TODO: update Pointer so he laies in 0,0
            this.addChild(this.pointer);

            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.scale(new Game.ƒ.Vector3(this.roomMinimapsize, this.roomMinimapsize, this.roomMinimapsize));
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate);


            this.createMiniRooms(_minimapInfo);

            this.setCurrentRoom(Game.currentRoom);

            Networking.spawnMinimap(_coordinates);
        }

        createMiniRooms(_roomTypes?: Interfaces.IMinimapInfos[]) {
            this.allCoordinates.forEach(element => {
                this.miniRooms.push(new MiniRoom(element, _roomTypes));
            });
            this.miniRooms.forEach(room => {
                this.addChild(room);
            })
        }

        eventUpdate = (_event: Event): void => {
            this.update();
        };

        private setCurrentRoom(_room: Generation.Room) {
            if (this.currentRoom != undefined) {
                let subX = this.currentRoom.coordinates.x - _room.coordinates.x;
                let subY = this.currentRoom.coordinates.y - _room.coordinates.y;
                this.offsetX += subX * this.roomMinimapsize;
                this.offsetY += subY * this.roomMinimapsize;
            }

            this.currentRoom = _room;
        }

        update(): void {
            if (this.currentRoom != undefined && this.currentRoom != Game.currentRoom) {
                this.miniRooms.find(room => room.coordinates.equals(Game.currentRoom.coordinates)).isDiscovered();
                this.setCurrentRoom(Game.currentRoom);
            }
        }
    }

    class MiniRoom extends Game.ƒ.Node {
        public discovered: boolean;
        public coordinates: Game.ƒ.Vector2;
        public roomType: Generation.ROOMTYPE;
        public opacity: number = 0.8;



        mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red", this.opacity)));
        normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white", this.opacity)));
        merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green", this.opacity)));
        treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow", this.opacity)));
        challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue", this.opacity)));
        bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black", this.opacity)));

        constructor(_coordinates: Game.ƒ.Vector2, _rooms?: Interfaces.IMinimapInfos[]) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            if (_rooms != null) {
                this.roomType = _rooms.find(room => room.coords.equals(this.coordinates)).roomType;
            } else {
                this.roomType = Generation.rooms.find(room => room.coordinates.equals(this.coordinates)).roomType;
            }
            this.discovered = false;

            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));

            let cmpMaterial: ƒ.ComponentMaterial;

            switch (this.roomType) {
                case Generation.ROOMTYPE.START:
                    cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case Generation.ROOMTYPE.NORMAL:
                    cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case Generation.ROOMTYPE.MERCHANT:
                    cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case Generation.ROOMTYPE.TREASURE:
                    cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case Generation.ROOMTYPE.CHALLENGE:
                    cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case Generation.ROOMTYPE.BOSS:
                    cmpMaterial = new ƒ.ComponentMaterial(this.bossRoomMat);
                    break;
            }
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x, this.coordinates.y, 1);
            // this.activate(false);
        }

        public isDiscovered() {
            this.discovered = true;
            this.activate(true);
        }
    }
}