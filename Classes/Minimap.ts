namespace UI {
    export class Minimap extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.UI;
        private minmapInfo: Interfaces.IMinimapInfos[];
        private roomMinimapsize: number = 0.5;
        private miniRooms: MiniRoom[] = [];
        public offsetX: number = 11;
        public offsetY: number = 6;
        private currentRoom: Generation.Room;
        private pointer: Game.ƒ.Node;

        constructor(_minimapInfo: Interfaces.IMinimapInfos[]) {
            super("Minimap");
            this.minmapInfo = _minimapInfo;


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


            this.createMiniRooms();

            this.setCurrentRoom(Game.currentRoom);

            if (Networking.client.id == Networking.client.idHost) {
                Networking.spawnMinimap(this.minmapInfo);
            }
        }

        createMiniRooms() {
            this.minmapInfo.forEach(element => {
                this.miniRooms.push(new MiniRoom(element.coords, element.roomType));
            });
            this.miniRooms.forEach(room => {
                this.addChild(room);
            })
        }

        eventUpdate = (_event: Event): void => {
            this.update();
        };

        private setCurrentRoom(_room: Generation.Room) {
            this.miniRooms.find(room => room.coordinates.equals(_room.coordinates)).isDiscovered();
            if (this.currentRoom != undefined) {
                let subX = this.currentRoom.coordinates.x - _room.coordinates.x;
                let subY = this.currentRoom.coordinates.y - _room.coordinates.y;
                this.offsetX += subX * this.roomMinimapsize;
                this.offsetY += subY * this.roomMinimapsize;
            }

            this.currentRoom = _room;
        }

        update(): void {
            if (this.currentRoom != undefined) {
                if (this.currentRoom != Game.currentRoom) {
                    this.setCurrentRoom(Game.currentRoom);
                }

                this.pointer.mtxLocal.translation = this.miniRooms.find(room => room.coordinates.equals(Game.currentRoom.coordinates)).mtxLocal.translation;
            }
        }
    }

    class MiniRoom extends Game.ƒ.Node {
        public discovered: boolean;
        public coordinates: Game.ƒ.Vector2;
        public roomType: Generation.ROOMTYPE;
        public opacity: number = 0.8;



        private mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        private startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red", this.opacity)));
        private normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white", this.opacity)));
        private merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green", this.opacity)));
        private treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow", this.opacity)));
        private challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue", this.opacity)));
        private bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black", this.opacity)));

        constructor(_coordinates: Game.ƒ.Vector2, _roomType: Generation.ROOMTYPE) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            this.roomType = _roomType;
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