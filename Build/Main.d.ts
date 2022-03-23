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
    let player2: Player.Player;
    let connected: boolean;
}
declare namespace Spawn {
    class Spawnables extends Game.ƒAid.NodeSprite {
        position: ƒ.Vector3;
        lifetime: number;
        constructor(_name: string, _position: ƒ.Vector3, _lifetime: number);
        lifespan(): void;
    }
}
declare namespace Player {
    class Attributes {
        healthPoints: number;
        speed: number;
        attackPoints: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number);
    }
}
declare namespace Spawn {
    class Bullet extends Spawnables {
        constructor(_name: string, _position: ƒ.Vector3, _lifetime: number);
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
    class Item extends Spawn.Spawnables {
        description: string;
        constructor(_name: string, _lifetime: number, _position: ƒ.Vector3, _description: string);
    }
}
declare namespace Level {
    class Landscape extends ƒ.Node {
        constructor(_name: string);
    }
}
declare namespace Networking {
    enum FUNCTION {
        SPAWN = 0,
        TRANSFORM = 1
    }
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
    let posUpdate: ƒ.Vector3;
    /**
     * sends transform over network
     * @param __position current position of Object
     */
    function updatePosition(_position: ƒ.Vector3): void;
}
declare namespace Player {
    class Player extends Game.ƒAid.NodeSprite {
        authority: string;
        items: Array<Items.Item>;
        hero: Character;
        position: ƒ.Vector3;
        constructor(_name: string, _authority: string, _hero: Character);
        move(_direction: ƒ.Vector3): void;
        attack(): void;
    }
}
