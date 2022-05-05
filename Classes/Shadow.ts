namespace Entity {
    export let txtShadow: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export class Shadow extends Game.ƒ.Node {
        private mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        private shadowMatt: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtShadow));
        shadowParent: Game.ƒ.Node;
        constructor(_parent: Game.ƒ.Node) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(this.shadowMatt);;

            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxWorld.translation = new Game.ƒ.Vector3(_parent.mtxLocal.translation.x, _parent.mtxLocal.translation.y, -0.01);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(2, 2, 2);
        }

        updateShadowPos() {
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z*-1);
        }
    }
}