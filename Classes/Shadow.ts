namespace Entity {
    export let txtShadow: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtShadowRound: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();

    export class Shadow extends Game.ƒ.Node {
        private mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
        private shadowMatt: ƒ.Material = new ƒ.Material("shadow", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtShadow));
        shadowParent: Game.ƒ.Node;
        protected cmpMaterial: ƒ.ComponentMaterial;
        constructor(_parent: Game.ƒ.Node) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));

            this.cmpMaterial = new ƒ.ComponentMaterial(this.shadowMatt);
            this.cmpMaterial.sortForAlpha = true;

            this.addComponent(this.cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());

            _parent.addChild(this);
        }

        updateShadowPos() {
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
            if (this.shadowParent instanceof Entity) {

                let offsetY: number = ((<Entity>this.shadowParent).shadowOffsetY * (<Entity>this.shadowParent).attributes.getScale);
                if (offsetY < (<Entity>this.shadowParent).shadowOffsetY) {
                    offsetY = ((<Entity>this.shadowParent).shadowOffsetY / (<Entity>this.shadowParent).attributes.getScale);
                }

                this.mtxLocal.translateY(-(((<Entity>this.shadowParent).spriteScaleFactor / (this.mtxWorld.scaling.y * (<Entity>this.shadowParent).spriteScaleFactor))) - offsetY);
                this.mtxLocal.translateX((<Entity>this.shadowParent).shadowOffsetX);
            }
        }
    }

    export class ShadowRound extends Shadow {
        private shadowMatRound: ƒ.Material = new ƒ.Material("shadow", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtShadowRound));
        constructor(_parent: Game.ƒ.Node) {
            super(_parent);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.shadowMatRound;
        }


        updateShadowPos() {
            let factor = (this.shadowParent.mtxLocal.translation.z * 0.1) + 1;
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(1 * factor, 1 * factor, 1 * factor);
        }

    }
}