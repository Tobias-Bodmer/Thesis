/// <reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts" />
/// <reference types="../fudge/core/build/fudgecore.js" />
/// <reference types="../fudge/aid/build/fudgeaid.js" />
declare namespace Game {
    enum GAMESTATES {
        PLAYING = 0,
        PAUSE = 1
    }
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;
    let canvas: HTMLCanvasElement;
    let gamestate: GAMESTATES;
    let viewport: ƒ.Viewport;
    let graph: ƒ.Node;
    let avatar1: Player.Player;
    let avatar2: Player.Player;
    let connected: boolean;
    let frameRate: number;
    let enemies: Enemy.Enemy[];
    let bullets: Bullets.Bullet[];
    let enemiesJSON: Player.Character[];
    let itemsJSON: Items.Item[];
    function cameraUpdate(): void;
}
declare namespace Interfaces {
    interface ISpawnable {
        lifetime?: number;
        lifespan(_a: ƒ.Node): void;
    }
    interface IKnockbackable {
        knockbackForce: number;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }
    interface IKillable {
        onDeath(): void;
    }
    interface IDamageable {
        getDamage(): void;
    }
}
declare namespace Enemy {
    export let txtTick: ƒ.TextureImage;
    export enum ENEMYNAME {
        BAT = 0,
        REDTICK = 1,
        SMALLTICK = 2,
        SKELETON = 3
    }
    export function getNameByID(_id: ENEMYNAME): "bat" | "redTick" | "smallTick" | "skeleton";
    enum BEHAVIOUR {
        IDLE = 0,
        FOLLOW = 1,
        FLEE = 2
    }
    enum STATES {
        IDLE = 0,
        WALK = 1
    }
    import ƒAid = FudgeAid;
    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        currentState: BEHAVIOUR;
        currentAnimation: STATES;
        tag: Tag.TAG;
        id: number;
        netId: number;
        properties: Player.Character;
        collider: Collider.Collider;
        scale: number;
        sizeDivideFactor: number;
        target: ƒ.Vector3;
        lifetime: number;
        canMoveX: boolean;
        canMoveY: boolean;
        moveDirection: Game.ƒ.Vector3;
        knockbackForce: number;
        animations: ƒAid.SpriteSheetAnimations;
        constructor(_id: ENEMYNAME, _properties: Player.Character, _position: ƒ.Vector2, _netId?: number);
        enemyUpdate(): void;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        updateCollider(): void;
        moveSimple(): void;
        moveAway(): void;
        lifespan(_graph: Game.ƒ.Node): void;
        getCanMoveXY(_direction: ƒ.Vector3): void;
    }
    export class EnemyDumb extends Enemy {
        constructor(_id: ENEMYNAME, _properties: Player.Character, _position: ƒ.Vector2, _netId?: number);
        enemyUpdate(): void;
        behaviour(): void;
        moveBehaviour(): void;
    }
    export class EnemyShoot extends Enemy {
        weapon: Weapons.Weapon;
        viewRadius: number;
        constructor(_id: number, _properties: Player.Character, _position: ƒ.Vector2, _weapon: Weapons.Weapon, _netId?: number);
        enemyUpdate(): void;
        shoot(_netId?: number): void;
    }
    export {};
}
declare namespace Items {
    enum ITEMTYPE {
        ADD = 0,
        SUBSTRACT = 1,
        PROCENTUAL = 2
    }
    abstract class Item extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        tag: Tag.TAG;
        netId: number;
        description: string;
        imgSrc: string;
        collider: Game.ƒ.Rectangle;
        lifetime: number;
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc?: string, _lifetime?: number, _netId?: number);
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
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _attributes: Player.Attributes, _type: ITEMTYPE, _imgSrc?: string, _lifetime?: number, _netId?: number);
        collisionDetection(): Promise<void>;
    }
}
declare namespace AnimationGeneration {
    export let txtRedTickIdle: ƒ.TextureImage;
    export let txtRedTickWalk: ƒ.TextureImage;
    export let txtBatIdle: ƒ.TextureImage;
    export import ƒAid = FudgeAid;
    class MyAnimationClass {
        id: Enemy.ENEMYNAME;
        spriteSheetIdle: ƒ.CoatTextured;
        spriteSheetWalk: ƒ.CoatTextured;
        idleNumberOfFrames: number;
        walkNumberOfFrames: number;
        idleFrameRate: number;
        walkFrameRate: number;
        clrWhite: ƒ.Color;
        animations: ƒAid.SpriteSheetAnimations;
        constructor(_id: Enemy.ENEMYNAME, _txtIdle: ƒ.TextureImage, _idleNumberOfFrames: number, _idleFrameRate: number, _txtWalk?: ƒ.TextureImage, _walkNumberOfFrames?: number, _walkFrameRate?: number);
    }
    export let sheetArray: MyAnimationClass[];
    export function getAnimationById(_id: Enemy.ENEMYNAME): MyAnimationClass;
    export function createAllAnimations(): void;
    export {};
}
declare namespace Player {
    class Attributes {
        healthPoints: number;
        maxHealthPoints: number;
        speed: number;
        attackPoints: number;
        coolDownReduction: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _cooldownReduction?: number);
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
        owner: Tag.TAG;
        netId: number;
        tick: number;
        positions: ƒ.Vector3[];
        hostPositions: ƒ.Vector3[];
        tag: Tag.TAG;
        flyDirection: ƒ.Vector3;
        collider: Collider.Collider;
        hitPoints: number;
        speed: number;
        lifetime: number;
        time: number;
        killcount: number;
        avatar: Game.ƒAid.NodeSprite;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _avatar: Game.ƒAid.NodeSprite, _netId?: number);
        move(): Promise<void>;
        updateRotation(_direction: ƒ.Vector3): void;
        bulletPrediction(): void;
        correctPosition(): Promise<void>;
        loadTexture(): void;
        collisionDetection(): Promise<void>;
    }
    class SlowBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _avatar: Game.ƒAid.NodeSprite, _netId?: number);
    }
    class MeleeBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _avatar: Game.ƒAid.NodeSprite, _netId?: number);
        loadTexture(): Promise<void>;
    }
    class HomingBullet extends Bullet {
        target: ƒ.Vector3;
        rotateSpeed: number;
        targetDirection: ƒ.Vector3;
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _target: ƒ.Vector3, _avatar: Game.ƒAid.NodeSprite, _netId?: number);
        move(): Promise<void>;
        calculateHoming(): void;
    }
}
declare namespace Player {
    class Character {
        name: string;
        attributes: Attributes;
        constructor(_name: string, _attributes: Attributes);
    }
}
declare namespace Collider {
    class Collider {
        radius: number;
        position: ƒ.Vector2;
        get top(): number;
        get left(): number;
        get right(): number;
        get bottom(): number;
        constructor(_position: ƒ.Vector2, _radius: number);
        collides(_collider: Collider): boolean;
        collidesRect(_collider: Game.ƒ.Rectangle): boolean;
        getIntersection(_collider: Collider): number;
        getIntersectionRect(_collider: ƒ.Rectangle): ƒ.Rectangle;
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
declare namespace Calculation {
    function getCloserAvatarPosition(_startPoint: ƒ.Vector3): ƒ.Vector3;
    function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number;
    function getRotatedVectorByAngle2D(_vectorToRotate: ƒ.Vector3, _angle: number): ƒ.Vector3;
}
declare namespace InputSystem {
    function calcPositionFromDegree(_degrees: number, _distance: number): ƒ.Vector2;
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
        HOST = 1,
        SETREADY = 2,
        SPAWN = 3,
        TRANSFORM = 4,
        SPAWNBULLET = 5,
        SPAWNBULLETENEMY = 6,
        BULLETTRANSFORM = 7,
        BULLETDIE = 8,
        SPAWNENEMY = 9,
        ENEMYTRANSFORM = 10,
        ENEMYDIE = 11,
        SPAWNITEM = 12,
        UPDATEATTRIBUTES = 13,
        ITEMDIE = 14,
        SENDROOM = 15,
        SWITCHROOMREQUEST = 16
    }
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
    let clients: Array<{
        id: string;
        ready: boolean;
    }>;
    let posUpdate: ƒ.Vector3;
    let someoneIsHost: boolean;
    let enemy: Enemy.Enemy;
    let currentIDs: number[];
    function conneting(): void;
    function setClientReady(): void;
    function setHost(): void;
    function spawnPlayer(_type?: Player.PLAYERTYPE): Promise<void>;
    function setClient(): void;
    /**
     * sends transform over network
     * @param __position current position of Object
     * @param _rotation current rotation of Object
     */
    function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3): void;
    function spawnBullet(_direction: ƒ.Vector3, _netId: number): void;
    function updateBullet(_position: ƒ.Vector3, _netId: number, _tick?: number): void;
    function spawnBulletAtEnemy(_bulletNetId: number, _enemyNetId: number): Promise<void>;
    function removeBullet(_netId: number): void;
    function spawnEnemy(_enemy: Enemy.Enemy, _netId: number): void;
    function updateEnemyPosition(_position: ƒ.Vector3, _netId: number): void;
    function removeEnemy(_netId: number): void;
    function spawnItem(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime: number, _netId: number, _attributes?: Player.Attributes, _type?: Items.ITEMTYPE): Promise<void>;
    function updateAvatarAttributes(_attributes: Player.Attributes, _type: Items.ITEMTYPE): void;
    function removeItem(_netId: number): void;
    function sendRoom(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: Generation.ROOMTYPE): void;
    function switchRoomRequest(_coordiantes: [number, number], _direction: [boolean, boolean, boolean, boolean]): void;
    function idGenerator(): number;
    function popID(_id: number): void;
}
declare namespace Player {
    enum PLAYERTYPE {
        RANGED = 0,
        MELEE = 1
    }
    abstract class Player extends Game.ƒAid.NodeSprite implements Interfaces.IKnockbackable {
        tag: Tag.TAG;
        items: Array<Items.Item>;
        properties: Character;
        weapon: Weapons.Weapon;
        hitable: boolean;
        collider: Collider.Collider;
        moveDirection: Game.ƒ.Vector3;
        knockbackForce: number;
        readonly abilityCount: number;
        currentabilityCount: number;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        constructor(_name: string, _properties: Character);
        move(_direction: ƒ.Vector3): void;
        collide(_direction: Game.ƒ.Vector3): void;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        doAbility(): void;
        cooldown(): void;
    }
    class Melee extends Player {
        readonly abilityCount: number;
        currentabilityCount: number;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doAbility(): void;
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
        tag: Tag.TAG;
        roomType: ROOMTYPE;
        coordinates: [number, number];
        walls: Wall[];
        doors: Door[];
        finished: boolean;
        neighbourN: Room;
        neighbourE: Room;
        neighbourS: Room;
        neighbourW: Room;
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
        setDoors(): void;
        getRoomSize(): number;
    }
    class Wall extends ƒ.Node {
        tag: Tag.TAG;
        collider: Game.ƒ.Rectangle;
        wallThickness: number;
        constructor(_position: Game.ƒ.Vector2, _width: number, _direction: [boolean, boolean, boolean, boolean]);
    }
    class Door extends ƒ.Node {
        tag: Tag.TAG;
        collider: Game.ƒ.Rectangle;
        doorWidth: number;
        doorThickness: number;
        parentRoom: Room;
        direction: [boolean, boolean, boolean, boolean];
        constructor(_parent: Room, _position: Game.ƒ.Vector2, _direction: [boolean, boolean, boolean, boolean], _roomSize: number);
        changeRoom(): void;
    }
}
declare namespace Generation {
    let rooms: Room[];
    function generateRooms(): void;
    function switchRoom(_currentRoom: Room, _direction: [boolean, boolean, boolean, boolean]): void;
}
declare namespace Tag {
    enum TAG {
        PLAYER = 0,
        ENEMY = 1,
        BULLET = 2,
        ITEM = 3,
        ROOM = 4,
        WALL = 5,
        DOOR = 6,
        DAMAGEUI = 7
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
    let txtSix: ƒ.TextureImage;
    let txtSeven: ƒ.TextureImage;
    let txtEight: ƒ.TextureImage;
    let txtNine: ƒ.TextureImage;
    let txtTen: ƒ.TextureImage;
    class DamageUI extends ƒ.Node {
        tag: Tag.TAG;
        up: number;
        lifetime: number;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector3, _damage: number);
        move(): Promise<void>;
        loadTexture(_texture: number): void;
    }
}
declare namespace Weapons {
    class Weapon {
        cooldownTime: number;
        currentCooldownTime: number;
        attackCount: number;
        currentAttackCount: number;
        constructor(_cooldownTime: number, _attackCount: number);
        cooldown(_faktor: number): void;
    }
}
