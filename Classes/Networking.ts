///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>

namespace Networking {
    import ƒClient = FudgeNet.FudgeClient;

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
        client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        client.connectToServer(IPConnection.value + PortConnection.value);

        console.log(+IPConnection.value)
        console.log(IPConnection.value + PortConnection.value);

        let formdata: FormData = new FormData(document.forms[1]);
        let protocol: string = formdata.get("protocol").toString();
        let ws: boolean = protocol == "ws";
        let receiver: string = formdata.get("receiver").toString();

        let message = "schwanz wie ne gans"

        client.dispatch({ route: ws ? FudgeNet.ROUTE.VIA_SERVER : undefined, content: { text: message } })

    }

    async function receiveMessage(_event: CustomEvent | MessageEvent | Event): Promise<void> {
        if (_event instanceof MessageEvent) {
            let message: FudgeNet.Message = JSON.parse(_event.data);
            if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                console.log(message.content);
            }
        }

    }

    window.addEventListener("beforeunload", onUnload, false);

    function onUnload() {
        //TODO: do we need to close connections?
    }
}