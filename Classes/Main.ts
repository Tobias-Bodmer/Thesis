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
    export let player: Player.Player;
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    //#endregion "PrivateVariables"

    //#region "essential"
    function init() {
        player = new Player.Player("Player1", "11", 5);
        
        ƒ.Debug.log(player);
        
        // let node: ƒ.Node = new ƒ.Node("Quad");
        
        // let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
        // let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
        // node.addComponent(cmpMesh);
        
        // let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatColored(ƒ.Color.CSS("WHITE")));
        // let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
        // node.addComponent(cmpMaterial);
        
        // graph.appendChild(node);
       
        graph.appendChild(player);

        ƒAid.addStandardLightComponents(graph);
        
        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);

        ƒ.Debug.log(graph);

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();
    }

    function waitOnConnection() {
        if (Networking.client != undefined && Networking.client.id != null || undefined) {
            document.getElementById("ConnectionGUI").style.visibility = "hidden";
            init();
        }else {
            setTimeout(waitOnConnection, 300);
        }
    }

    function draw(): void {
        viewport.draw();
    }

    function update(): void {
        draw();
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, 60);
    //#endregion "essential"
}