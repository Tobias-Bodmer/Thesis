//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
//#endregion "Imports"

namespace Game {
    import ƒ = FudgeCore;
    import ƒAid = FudgeAid;
    import ƒClient = FudgeNet.FudgeClient;

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
    let viewport: ƒ.Viewport = new ƒ.Viewport();
    let graph: ƒ.Node = new ƒ.Node("Graph");
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    //#endregion "PrivateVariables"

    //#region "essential"
    function init() {
        graph.addChild(new Level.Landscape(""));

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();
    }

    function draw(): void {
        viewport.draw();
    }
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
        client.connectToServer();

        console.log(+IPConnection.value)
        console.log(IPConnection.value + PortConnection.value);
    }
    //#endregion "FudgeNetComponent"
}