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
    let enemiesJSON: Player.Character[];
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
        netId: number;
        properties: Player.Character;
        target: Player.Player;
        collider: Game.ƒ.Rectangle;
        lifetime: number;
        canMoveX: boolean;
        canMoveY: boolean;
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
        moveAway(): void;
        lifespan(_graph: Game.ƒ.Node): void;
        getCanMoveXY(direction: ƒ.Vector3): void;
    }
    class EnemyDumb extends Enemy {
        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2);
        move(): void;
        lifespan(_graph: ƒ.Node): void;
    }
    class EnemyFlee extends Enemy {
        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2);
        move(): void;
        lifespan(_graph: ƒ.Node): void;
    }
}
declare namespace Items {
    enum ITEMTYPE {
        ADD = 0,
        SUBSTRACT = 1,
        PROCENTUAL = 2
    }
    class Item extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        tag: Tag.Tag;
        id: number;
        description: string;
        imgSrc: string;
        collider: Game.ƒ.Rectangle;
        lifetime: number;
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc?: string, _lifetime?: number);
        lifespan(_graph: ƒ.Node): void;
        collisionDetection(): Promise<void>;
    }
    class InternalItem extends Item {
        attributes: Player.Attributes;
        type: ITEMTYPE;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _attributes: Player.Attributes, _type: ITEMTYPE, _imgSrc?: string, _lifetime?: number);
        collisionDetection(): Promise<void>;
    }
}
declare namespace Player {
    class Attributes {
        healthPoints: number;
        maxHealthPoints: number;
        speed: number;
        attackPoints: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number);
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_attributes: Player.Attributes, _itemType: Items.ITEMTYPE): void;
    }
}
declare namespace Bullets {
    let bulletTxt: ƒ.TextureImage;
    class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable {
        tag: Tag.Tag;
        flyDirection: ƒ.Vector3;
        collider: Game.ƒ.Rectangle;
        hitPoints: number;
        speed: number;
        lifetime: number;
        killcount: number;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3);
        move(): Promise<void>;
        loadTexture(): void;
        collisionDetection(): Promise<void>;
    }
    class SlowBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3);
    }
    class MeleeBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3);
        loadTexture(): Promise<void>;
    }
}
declare namespace Player {
    class Character {
        name: string;
        attributes: Attributes;
        constructor(_name: string, _attributes: Attributes);
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
    function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number;
    function move(): void;
}
declare namespace Level {
    class Landscape extends ƒ.Node {
        constructor(_name: string);
    }
}
declare namespace Networking {
    enum FUNCTION {
        CONNECTED = 0,
        SPAWN = 1,
        TRANSFORM = 2,
        BULLET = 3,
        SPAWNENEMY = 4,
        ENEMYTRANSFORM = 5,
        ENEMYDIE = 6
    }
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
    let clients: string[];
    let posUpdate: ƒ.Vector3;
    let someoneIsHost: boolean;
    let enemy: Enemy.Enemy;
    let currentIDs: number[];
    function conneting(): void;
    function spawnPlayer(): void;
    /**
     * sends transform over network
     * @param __position current position of Object
     * @param _rotation current rotation of Object
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
    abstract class Player extends Game.ƒAid.NodeSprite {
        tag: Tag.Tag;
        items: Array<Items.Item>;
        properties: Character;
        weapon: Weapons.Weapon;
        collider: ƒ.Rectangle;
        constructor(_name: string, _properties: Character);
        move(_direction: ƒ.Vector3): void;
        attack(_direction: ƒ.Vector3): void;
        cooldown(): void;
        collector(): void;
    }
    class Melee extends Player {
        attack(_direction: ƒ.Vector3): void;
    }
    class Ranged extends Player {
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
        WALL = 5,
        DAMAGEUI = 6
    }
}
declare namespace UI {
    function updateUI(): void;
    let txtZero: ƒ.TextureImage;
    let txtOne: ƒ.TextureImage;
    let txtTow: ƒ.TextureImage;
    let txtThree: ƒ.TextureImage;
    let txtFour: ƒ.TextureImage;
    let txtFive: ƒ.TextureImage;
    class DamageUI extends ƒ.Node {
        tag: Tag.Tag;
        lifetime: number;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector3, _damage: number);
        loadTexture(_texture: number): void;
        move(): Promise<void>;
    }
}
declare namespace Weapons {
    class Weapon {
        cooldownTime: number;
        currentCooldownTime: number;
        attackCount: number;
        currentAttackCount: number;
        constructor(_cooldownTime: number, _attackCount: number);
    }
}
