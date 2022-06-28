namespace UI {
    export class Minimap extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.UI;
        private minmapInfo: Interfaces.IMinimapInfos[];
        private roomMinimapsize: number = 0.8;
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
            this.pointer.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("challengeRoomMat", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")))));
            this.pointer.addComponent(new ƒ.ComponentTransform());
            this.pointer.mtxLocal.scale(Game.ƒ.Vector3.ONE(this.roomMinimapsize / 2));
            this.pointer.mtxLocal.translateZ(10);

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

    export let normalRoom: ƒ.TextureImage = new ƒ.TextureImage();;
    export let challengeRoom: ƒ.TextureImage = new ƒ.TextureImage();;
    export let merchantRoom: ƒ.TextureImage = new ƒ.TextureImage();;
    export let treasureRoom: ƒ.TextureImage = new ƒ.TextureImage();;
    export let bossRoom: ƒ.TextureImage = new ƒ.TextureImage();;

    class MiniRoom extends Game.ƒ.Node {
        public discovered: boolean;
        public coordinates: Game.ƒ.Vector2;
        public roomType: Generation.ROOMTYPE;
        public opacity: number = 0.75;

        private roomMat: ƒ.Material;


        private mesh: ƒ.MeshQuad = new ƒ.MeshQuad;

        constructor(_coordinates: Game.ƒ.Vector2, _roomType: Generation.ROOMTYPE) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            this.roomType = _roomType;
            this.discovered = false;

            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));

            let cmpMaterial: ƒ.ComponentMaterial;

            switch (this.roomType) {
                case Generation.ROOMTYPE.START:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), normalRoom));
                    break;
                case Generation.ROOMTYPE.NORMAL:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), normalRoom));
                    break;
                case Generation.ROOMTYPE.MERCHANT:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), merchantRoom));
                    break;
                case Generation.ROOMTYPE.TREASURE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), treasureRoom));
                    break;
                case Generation.ROOMTYPE.CHALLENGE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), challengeRoom));
                    break;
                case Generation.ROOMTYPE.BOSS:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), bossRoom));
                    break;
            }
            cmpMaterial = new ƒ.ComponentMaterial(this.roomMat);
            cmpMaterial.sortForAlpha = true;
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x, this.coordinates.y, 1);
            this.activate(false);
        }

        public isDiscovered() {
            this.discovered = true;
            this.activate(true);
        }
    }
}