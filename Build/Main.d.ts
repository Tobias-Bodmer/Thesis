/// <reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts" />
/// <reference path="../FUDGE/Net/Build/Server/FudgeServer.d.ts" />
/// <reference types="../fudge/core/build/fudgecore.js" />
/// <reference types="../fudge/aid/build/fudgeaid.js" />
declare namespace Enemy {
}
declare namespace Items {
}
declare namespace Level {
    class Landscape extends ƒ.Node {
        constructor(_name: string);
    }
}
declare namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;
    let viewport: ƒ.Viewport;
    let graph: ƒ.Node;
}
declare namespace Player {
}
