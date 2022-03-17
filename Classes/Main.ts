//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"

namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;

    //#region "DomElements"
    export let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("Canvas");   
    window.addEventListener("load", init);
    //#endregion "DomElements"

    //#region "PublicVariables"
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let graph: ƒ.Node = new ƒ.Node("Graph");
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    //#endregion "PrivateVariables"

    //#region "essential"
    function init() {
        cmpCamera.mtxPivot.translateZ(15);

        cmpCamera.mtxPivot.rotateX(180);

        cmpCamera.mtxPivot.lookAt(ƒ.Vector3.ZERO(), ƒ.Vector3.Y());

        graph.addChild(new ƒAid.Node("blob", ƒ.Matrix4x4.IDENTITY(), new ƒ.Material("mtrCharacter", ƒ.ShaderFlat, new ƒ.CoatColored(ƒ.Color.CSS("withe", 0))), new ƒ.MeshCube()));
        
        graph.getChildren()[0].mtxLocal.scale(new ƒ.Vector3(1, 1, 1))

        console.log(graph.getChildren()[0].name);

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();
    }

    function draw(): void {
        viewport.draw();
    }

    function update() {
        draw();
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, 69);
    //#endregion "essential"
}