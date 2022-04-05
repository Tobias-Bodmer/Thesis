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
    let frameRate: number;
    let enemies: Enemy.Enemy[];
    let bat: Enemy.Enemy;
    function cameraUpdate(): void;
}
declare namespace Interfaces {
    interface ISpawnable {
        lifetime?: number;
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
declare namespace Enemy {
    class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        tag: Tag.Tag;
        id: number;
        properties: Player.Character;
        target: Player.Player;
        collider: Game.ƒ.Rectangle;
        lifetime: number;
        /**
         * Creates an Enemy
         * @param _name Name of the enemy
         * @param _properties Properties, storing attributes and stuff
         * @param _position position where to spawn
         * @param _aiType optional: standard ai = dumb
         */
        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2, _id?: number);
        move(): void;
        updateCollider(): void;
        moveSimple(): void;
        lifespan(_graph: Game.ƒ.Node): void;
        getCanMoveXY(direction: ƒ.Vector3): [boolean, boolean];
    }
    class EnemyFlee extends Enemy {
        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2);
        move(): void;
        moveAway(): void;
    }
}
declare namespace Items {
    class Item extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        tag: Tag.Tag;
        description: string;
        imgSrc: string;
        lifetime: number;
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime?: number);
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
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime: number, _attributes: Player.Attributes, _type: ITEMTYPE);
    }
}
declare namespace Player {
    class Attributes {
        healthPoints: number;
        maxhealthPoints: number;
        speed: number;
        attackPoints: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number);
    }
}
declare namespace Items {
    class Bullet extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        tag: Tag.Tag;
        flyDirection: ƒ.Vector3;
        collider: Game.ƒ.Rectangle;
        hitPoints: number;
        speed: number;
        lifetime: number;
        private killcount;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3);
        move(): Promise<void>;
        collisionDetection(): Promise<void>;
    }
    class slowBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3);
    }
}
declare namespace Player {
    class Character {
        name: string;
        attributes: Attributes;
        constructor(name: string, attributes: Attributes);
    }
}
declare namespace EnemySpawner {
    function spawnEnemies(): void;
    class EnemySpawnes {
        spawnPositions: ƒ.Vector2[];
        numberOfENemies: number;
        spawnOffset: number;
        constructor(_roomSize: number, _numberOfEnemies: number);
        getSpawnPositions(_room: Generation.Room): ƒ.Vector2[];
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
        TRANSFORM = 1,
        BULLET = 2,
        SPAWNENEMY = 3,
        ENEMYTRANSFORM = 4,
        ENEMYDIE = 5
    }
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
    let posUpdate: ƒ.Vector3;
    let someoneIsHost: boolean;
    let enemy: Enemy.Enemy;
    /**
     * sends transform over network
     * @param __position current position of Object
     */
    function updatePosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3): void;
    function updateBullet(_direction: ƒ.Vector3): void;
    function spawnEnemy(_enemy: Enemy.Enemy, _id: number): void;
    function updateEnemyPosition(_position: ƒ.Vector3, _id: number): void;
    function removeEnemy(_id: number): void;
    function idGenerator(): number;
    function popID(_id: number): void;
}
declare namespace Player {
    class Player extends Game.ƒAid.NodeSprite {
        tag: Tag.Tag;
        items: Array<Items.Item>;
        hero: Character;
        cooldownTime: number;
        currentCooldownTime: number;
        attackCount: number;
        currentAttackCount: number;
        collider: ƒ.Rectangle;
        constructor(_name: string, _properties: Character);
        move(_direction: ƒ.Vector3): void;
        attack(_direction: ƒ.Vector3): void;
        cooldown(): void;
        collector(): void;
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_item: Items.AttributeItem): void;
    }
}
declare namespace Generation {
    enum ROOMTYPE {
        START = 0,
        NORMAL = 1,
        MERCHANT = 2,
        TREASURE = 3,
        CHALLENGE = 4,
        BOSS = 5
    }
    class Room extends ƒ.Node {
        tag: Tag.Tag;
        roomType: ROOMTYPE;
        coordinates: [number, number];
        walls: Wall[];
        roomSize: number;
        exits: [boolean, boolean, boolean, boolean];
        mesh: ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh;
        startRoomMat: ƒ.Material;
        normalRoomMat: ƒ.Material;
        merchantRoomMat: ƒ.Material;
        treasureRoomMat: ƒ.Material;
        challengeRoomMat: ƒ.Material;
        bossRoomMat: ƒ.Material;
        cmpMaterial: ƒ.ComponentMaterial;
        constructor(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: ROOMTYPE);
        getRoomSize(): number;
    }
    class Wall extends ƒ.Node {
        tag: Tag.Tag;
        collider: Game.ƒ.Rectangle;
        wallThickness: number;
        constructor(_position: Game.ƒ.Vector2, _width: number);
    }
}
declare namespace Generation {
    function generateRooms(): void;
}
declare namespace Tag {
    enum Tag {
        PLAYER = 0,
        ENEMY = 1,
        BULLET = 2,
        ITEM = 3,
        ROOM = 4,
        WALL = 5
    }
}
declare namespace UI {
    function updateUI(): void;
}
