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
    let enemiesJSON: Entity.Entity[];
    let itemsJSON: Items.Item[];
    let bulletsJSON: Bullets.Bullet[];
    function cameraUpdate(): void;
}
declare namespace Entity {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimation: ANIMATIONSTATES;
        tag: Tag.TAG;
        id: Entity.ID;
        attributes: Attributes;
        collider: Collider.Collider;
        canMoveX: boolean;
        canMoveY: boolean;
        moveDirection: Game.ƒ.Vector3;
        animations: ƒAid.SpriteSheetAnimations;
        idleScale: number;
        constructor(_id: Entity.ID, _attributes: Attributes);
        update(): void;
        updateCollider(): void;
        collide(_direction: ƒ.Vector3): void;
        getDamage(_value: number): void;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }
    enum ANIMATIONSTATES {
        IDLE = 0,
        WALK = 1
    }
    enum ID {
        PLAYER1 = 0,
        PLAYER2 = 1,
        BAT = 2,
        REDTICK = 3,
        SMALLTICK = 4,
        SKELETON = 5
    }
    function getNameById(_id: Entity.ID): string;
}
declare namespace Enemy {
    let txtTick: ƒ.TextureImage;
    enum BEHAVIOUR {
        IDLE = 0,
        FOLLOW = 1,
        FLEE = 2
    }
    class Enemy extends Entity.Entity implements Interfaces.IKnockbackable {
        currentState: BEHAVIOUR;
        netId: number;
        target: ƒ.Vector3;
        lifetime: number;
        moveDirection: Game.ƒ.Vector3;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        moveSimple(): void;
        moveAway(): void;
        getDamage(_value: number): void;
        die(): void;
        collide(_direction: ƒ.Vector3): void;
    }
    class EnemyDumb extends Enemy {
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        behaviour(): void;
        moveBehaviour(): void;
    }
    class EnemyShoot extends Enemy {
        weapon: Weapons.Weapon;
        viewRadius: number;
        constructor(_id: number, _attributes: Entity.Attributes, _position: ƒ.Vector2, _weapon: Weapons.Weapon, _netId?: number);
        update(): void;
        shoot(_netId?: number): void;
    }
}
declare namespace Interfaces {
    interface ISpawnable {
        lifetime?: number;
        despawn(): void;
    }
    interface IKnockbackable {
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }
    interface IKillable {
        onDeath(): void;
    }
    interface IDamageable {
        getDamage(): void;
    }
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
        despawn(): void;
        collisionDetection(): Promise<void>;
    }
    class InternalItem extends Item {
        attributes: Entity.Attributes;
        type: ITEMTYPE;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _attributes: Entity.Attributes, _type: ITEMTYPE, _imgSrc?: string, _lifetime?: number, _netId?: number);
        collisionDetection(): Promise<void>;
    }
}
declare namespace AnimationGeneration {
    export let txtRedTickIdle: ƒ.TextureImage;
    export let txtRedTickWalk: ƒ.TextureImage;
    export let txtBatIdle: ƒ.TextureImage;
    export import ƒAid = FudgeAid;
    class MyAnimationClass {
        id: Entity.ID;
        spriteSheetIdle: ƒ.CoatTextured;
        spriteSheetWalk: ƒ.CoatTextured;
        idleNumberOfFrames: number;
        walkNumberOfFrames: number;
        idleFrameRate: number;
        walkFrameRate: number;
        clrWhite: ƒ.Color;
        animations: ƒAid.SpriteSheetAnimations;
        idleScale: number;
        walkScale: number;
        constructor(_id: Entity.ID, _txtIdle: ƒ.TextureImage, _idleNumberOfFrames: number, _idleFrameRate: number, _txtWalk?: ƒ.TextureImage, _walkNumberOfFrames?: number, _walkFrameRate?: number);
    }
    export let sheetArray: MyAnimationClass[];
    export function getAnimationById(_id: Entity.ID): MyAnimationClass;
    export function createAllAnimations(): void;
    export {};
}
declare namespace Entity {
    class Attributes {
        healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number;
        hitable: boolean;
        speed: number;
        attackPoints: number;
        coolDownReduction: number;
        scale: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _cooldownReduction?: number);
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_attributes: Entity.Attributes, _itemType: Items.ITEMTYPE): void;
    }
}
declare namespace Bullets {
    enum NORMALBULLETS {
        STANDARD = 0,
        HIGHSPEED = 1,
        SLOW = 2,
        MELEE = 3
    }
    let bulletTxt: ƒ.TextureImage;
    class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        tag: Tag.TAG;
        owner: Tag.TAG;
        netId: number;
        tick: number;
        positions: ƒ.Vector3[];
        hostPositions: ƒ.Vector3[];
        flyDirection: ƒ.Vector3;
        direction: ƒ.Vector3;
        collider: Collider.Collider;
        hitPoints: number;
        speed: number;
        lifetime: number;
        knockbackForce: number;
        type: NORMALBULLETS;
        time: number;
        killcount: number;
        despawn(): Promise<void>;
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number);
        update(): Promise<void>;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void;
        updateRotation(_direction: ƒ.Vector3): void;
        bulletPrediction(): void;
        correctPosition(): Promise<void>;
        loadTexture(): void;
        collisionDetection(): Promise<void>;
    }
    class MeleeBullet extends Bullet {
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number);
        loadTexture(): Promise<void>;
    }
    class HomingBullet extends Bullet {
        target: ƒ.Vector3;
        rotateSpeed: number;
        targetDirection: ƒ.Vector3;
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _target?: ƒ.Vector3, _netId?: number);
        update(): Promise<void>;
        calculateHoming(): void;
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
    function spawnByID(_id: Entity.ID, _position: ƒ.Vector2, _attributes?: Entity.Attributes, _netID?: number): void;
    function networkSpawnById(_id: Entity.ID, _position: ƒ.Vector2, _attributes: Entity.Attributes, _netID: number): void;
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
        ENEMYSTATE = 11,
        ENEMYDIE = 12,
        SPAWNITEM = 13,
        UPDATEATTRIBUTES = 14,
        ITEMDIE = 15,
        SENDROOM = 16,
        SWITCHROOMREQUEST = 17
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
    function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3): void;
    function spawnBullet(_direction: ƒ.Vector3, _netId: number): void;
    function updateBullet(_position: ƒ.Vector3, _netId: number, _tick?: number): void;
    function spawnBulletAtEnemy(_bulletNetId: number, _enemyNetId: number): Promise<void>;
    function removeBullet(_netId: number): void;
    function spawnEnemy(_enemy: Enemy.Enemy, _netId: number): void;
    function updateEnemyPosition(_position: ƒ.Vector3, _netId: number, _state: Entity.ANIMATIONSTATES): void;
    function updateEnemyState(_state: Entity.ANIMATIONSTATES, _netId: number): void;
    function removeEnemy(_netId: number): void;
    function spawnItem(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc: string, _lifetime: number, _netId: number, _attributes?: Entity.Attributes, _type?: Items.ITEMTYPE): Promise<void>;
    function updateAvatarAttributes(_attributes: Entity.Attributes, _type: Items.ITEMTYPE): void;
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
    abstract class Player extends Entity.Entity implements Interfaces.IKnockbackable {
        items: Array<Items.Item>;
        weapon: Weapons.Weapon;
        readonly abilityCount: number;
        currentabilityCount: number;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes);
        move(_direction: ƒ.Vector3): void;
        collide(_direction: Game.ƒ.Vector3): void;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void;
        doAbility(): void;
        cooldown(): void;
    }
    class Melee extends Player {
        readonly abilityCount: number;
        currentabilityCount: number;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        weapon: Weapons.Weapon;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doAbility(): void;
    }
    class Ranged extends Player {
        doAbility(): void;
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
        bulletType: Bullets.NORMALBULLETS;
        projectileAmount: number;
        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.NORMALBULLETS, _projectileAmount: number);
        shoot(_owner: Tag.TAG, _position: ƒ.Vector2, _direciton: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        fire(_owner: Tag.TAG, _magazine: Bullets.Bullet[], _sync?: boolean): void;
        setBulletDirection(_magazine: Bullets.Bullet[]): Bullets.Bullet[];
        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.NORMALBULLETS, _amount: number, _netId?: number): Bullets.Bullet[];
        cooldown(_faktor: number): void;
    }
}
