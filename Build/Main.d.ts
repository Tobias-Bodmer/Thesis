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
    interface ISpawnable {
        position: ƒ.Vector3;
        lifetime: number;
        lifespan(_a: ƒ.Node): void;
    }
}
declare namespace Player {
    interface IKillable {
        onDeath(): void;
    }
    interface IDamagble {
        getDamage(): void;
    }
}
declare namespace Items {
    class Item extends Game.ƒAid.NodeSprite implements Spawn.ISpawnable {
        description: string;
        position: ƒ.Vector3;
        lifetime: number;
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _lifetime?: number);
        lifespan(_graph: ƒ.Node): void;
    }
}
declare namespace Items {
    enum ITEMTYPE {
        ADD = 0,
        SUBSTRACT = 1,
        PROCENTUAL = 2
    }
    class AttributeItem extends Item {
        type: ITEMTYPE;
        attributes: Player.Attributes;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _lifetime: number, _attributes: Player.Attributes, _type: ITEMTYPE);
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
    class Bullet extends Game.ƒAid.NodeSprite implements ISpawnable {
        attackPoints: number;
        position: ƒ.Vector3;
        lifetime: number;
        lifespan(): boolean;
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
    class Enemy {
    }
}
declare namespace InputSystem {
    function move(): void;
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
        rect1: ƒ.Rectangle;
        constructor(_name: string, _authority: string, _hero: Character);
        move(_direction: ƒ.Vector3): void;
        attack(): void;
        collector(): void;
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_item: Items.AttributeItem): void;
    }
}
