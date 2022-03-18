///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
///<reference path="../FUDGE/Net/Build/Server/FudgeServer.d.ts"/>

namespace Networking {
    import ƒClient = FudgeNet.FudgeClient;
    // import ƒServer = FudgeServer;

    export let client: ƒClient;

    let portHost = <HTMLInputElement>document.getElementById("PortHost");
    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = <HTMLInputElement>document.getElementById("IPConnection");
    let PortConnection = <HTMLInputElement>document.getElementById("PortConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);

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
        client = new ƒClient();
        client.connectToServer(IPConnection.value + PortConnection.value);

        console.log(+IPConnection.value)
        console.log(IPConnection.value + PortConnection.value);
    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: do we need to close connections?
    }
}