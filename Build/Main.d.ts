/// <reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts" />
/// <reference path="../FUDGE/Net/Build/Server/FudgeServer.d.ts" />
/// <reference types="../fudge/core/build/fudgecore.js" />
/// <reference types="../fudge/aid/build/fudgeaid.js" />
declare namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;
    let canvas: HTMLCanvasElement;
    let viewport: ƒ.Viewport;
    let graph: ƒ.Node;
}
declare namespace Enemy {
}
declare namespace InputSystem {
}
declare namespace Items {
    class Item {
        constructor();
    }
}
declare namespace Level {
    class Landscape extends ƒ.Node {
        constructor(_name: string);
    }
}
declare namespace Networking {
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
}
declare namespace Player {
    class Player extends ƒAid.NodeSprite {
        authority: string;
        healthPoints: number;
        attackPoints: number;
        items: Array<Items.Item>;
        constructor(_name: string, _authority: string);
        move(_direction: ƒ.Vector2): void;
        attack(): void;
    }
}
