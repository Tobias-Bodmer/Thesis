namespace Generation {
    export enum ROOMTYPE {
        START,
        NORMAL,
        MERCHANT,
        TREASURE,
        CHALLENGE,
        BOSS
    }

    export class Room extends ƒ.Node {
        public roomType: ROOMTYPE
        public coordinates: [number, number]; // X Y
        exits: [boolean, boolean, boolean, boolean] // N E S W
        node: ƒ.Node = new ƒ.Node("Quad");
        mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")));
        normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));

        cmpMaterial: ƒ.ComponentMaterial;

        constructor(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: ROOMTYPE) {
            super(_name);
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;
            switch (_roomType) {
                case ROOMTYPE.START:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case ROOMTYPE.NORMAL:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case ROOMTYPE.MERCHANT:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case ROOMTYPE.TREASURE:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case ROOMTYPE.CHALLENGE:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case ROOMTYPE.BOSS:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.bossRoomMat);
                    break;
            }

            this.node.addComponent(new ƒ.ComponentTransform());
            this.node.addComponent(this.cmpMesh);
            this.node.addComponent(this.cmpMaterial);
            Game.graph.addChild(this.node);
            this.node.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates[0], this.coordinates[1], 0);
        }
    }
}