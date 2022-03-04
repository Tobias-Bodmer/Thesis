    //#region "Imports"
    // import ƒ = FudgeCore;
    // import ƒAid = FudgeAid;
    // import ƒInterface = FudgeUserInterface;
    import { FudgeServer } from "../FUDGE/Net/Server/FudgeServer.js";
    import ƒNet = FudgeNet;
    //#endregion "Imports"

namespace Game {
    //#region "DomElements"
    let portHost = (<HTMLInputElement>document.getElementById("PortHost"));
    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = (<HTMLInputElement>document.getElementById("IPConnection"));
    let PortConnection = (<HTMLInputElement>document.getElementById("PortConnection"));
    document.getElementById("Connecting").addEventListener("click", conneting, true);
    //#endregion "DomElements"

    //#region "PublicVariables"

    //#endregion "PublicVariables"

    //#region "PrivateVariables"

    //#endregion "PrivateVariables"
    
    //#region "FudgeNetComponent"
    function hostServer() {
        if (!isNaN(+portHost.value)) {

            //TODO: learn FudgeNet
            let host = new FudgeServer();
            host.startUp(+portHost.value);

            console.log(host.socket);
        } else {
            alert("Your Port is not a number");
        }
    }
    
    function conneting() {
        if (!isNaN(+IPConnection.value) && !isNaN(+PortConnection.value)) {
            
            //TODO: learn FudgeNet
            let client = new ƒNet.FudgeClient();
            client.connectToServer();

            console.log(+IPConnection.value)
            console.log(IPConnection.value + PortConnection.value);
        } else {
            alert("Your IP or Port is not a number");
        }
     }
    //#endregion "FudgeNetComponent"
}