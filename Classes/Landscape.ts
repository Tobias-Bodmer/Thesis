namespace Level {

    export class Landscape extends ƒ.Node{
        constructor(_name: string) {
            super(_name);

            this.addChild(new Game.ƒAid.Node("blob", new ƒ.Matrix4x4(), new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatColored(new ƒ.Color(1,1,1,0),1))))

            // this.getChildren()[0].getComponent(Game.ƒ.ComponentTransform).mtxLocal.translateZ(-2)

            console.log();
        }
    }

}