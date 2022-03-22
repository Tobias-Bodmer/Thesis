/// <reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts" />
/// <reference types="../fudge/core/build/fudgecore.js" />
/// <reference types="../fudge/aid/build/fudgeaid.js" />
declare namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;
    let canvas: HTMLCanvasElement;
    let viewport: ƒ.Viewport;
    let graph: ƒ.Node;
    let player: Player.Player;
}
declare namespace Player {
    class Attributes {
        healthPoints: number;
        speed: number;
        attackPoints: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number);
    }
}
declare namespace Player {
    class Character {
        name: string;
        attributes: Attributes;
        constructor(name: string, attributes: Attributes);
    }
}
declare namespace Enemy {
}
declare namespace InputSystem {
    function move(): void;
}
declare namespace Items {
    class Item {
        itemName: string;
        description: string;
        constructor(_itemName: string, _description: string);
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
    class Player extends Game.ƒAid.NodeSprite {
        authority: string;
        items: Array<Items.Item>;
        hero: Character;
        constructor(_name: string, _authority: string, _hero: Character);
        move(_direction: ƒ.Vector3): void;
        attack(): void;
    }
}
