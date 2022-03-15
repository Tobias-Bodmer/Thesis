//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
///<reference path="../FUDGE/Net/Build/Server/FudgeServer.d.ts"/>
//#endregion "Imports"

namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;
    import ƒClient = FudgeNet.FudgeClient;
    // import ƒServer = FudgeServer;

    //#region "DomElements"
    let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("Canvas");
    let portHost = <HTMLInputElement>document.getElementById("PortHost");
    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    let PortConnection = <HTMLInputElement>document.getElementById("PortConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);
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

    //#region "FudgeNetComponent"
    function hostServer() {
        if (!isNaN(+portHost.value)) {

            //TODO: learn FudgeNet
            // let host = new FudgeServer();


            // host.startUp(+portHost.value);

            // console.log(host);
        } else {
            alert("Your Port is not a number");
        }
    }

    function conneting() {
        let client = new ƒClient();
        client.connectToServer(IPConnection.value + PortConnection.value);

        console.log(+IPConnection.value)
        console.log(IPConnection.value + PortConnection.value);
    }
    //#endregion "FudgeNetComponent"
}