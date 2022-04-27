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
    let currentRoom: Generation.Room;
    let connected: boolean;
    let frameRate: number;
    let entities: Entity.Entity[];
    let enemies: Enemy.Enemy[];
    let bullets: Bullets.Bullet[];
    let items: Items.Item[];
    let coolDowns: Ability.Cooldown[];
    let enemiesJSON: Entity.Entity[];
    let internalItemJSON: Items.InternalItem[];
    let buffItemJSON: Items.BuffItem[];
    let bulletsJSON: Bullets.Bullet[];
    let loaded: boolean;
    function pause(_sync: boolean, _triggerOption: boolean): void;
    function playing(_sync: boolean, _triggerOption: boolean): void;
    function loadTextures(): Promise<void>;
    function cameraUpdate(): void;
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
        randomX: number;
        lifespan(_graph: ƒ.Node): Promise<void>;
        constructor(_position: ƒ.Vector3, _damage: number);
        move(): Promise<void>;
        loadTexture(_damage: number): void;
    }
    let healParticle: ƒ.TextureImage;
    let poisonParticle: ƒ.TextureImage;
    let burnParticle: ƒ.TextureImage;
    let bleedingParticle: ƒ.TextureImage;
    let slowParticle: ƒ.TextureImage;
    class Particles extends Game.ƒAid.NodeSprite {
        id: Buff.BUFFID;
        animationParticles: Game.ƒAid.SpriteSheetAnimation;
        particleframeNumber: number;
        particleframeRate: number;
        width: number;
        height: number;
        constructor(_id: Buff.BUFFID, _texture: Game.ƒ.TextureImage, _frameCount: number, _frameRate: number);
    }
}
declare namespace Entity {
    class Entity extends Game.ƒAid.NodeSprite {
        private currentAnimationState;
        private performKnockback;
        tag: Tag.TAG;
        netId: number;
        id: Entity.ID;
        attributes: Attributes;
        collider: Collider.Collider;
        items: Array<Items.Item>;
        weapon: Weapons.Weapon;
        buffs: Buff.Buff[];
        protected canMoveX: boolean;
        protected canMoveY: boolean;
        protected moveDirection: Game.ƒ.Vector3;
        protected animationContainer: AnimationGeneration.AnimationContainer;
        protected idleScale: number;
        protected currentKnockback: ƒ.Vector3;
        constructor(_id: Entity.ID, _attributes: Attributes, _netId: number);
        update(): void;
        updateCollider(): void;
        updateBuffs(): void;
        collide(_direction: ƒ.Vector3): void;
        calculateCollider(_collider: Collider.Collider[] | Game.ƒ.Rectangle[], _direction: ƒ.Vector3): void;
        getDamage(_value: number): void;
        die(): void;
        private getDamageReduction;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        reduceKnockback(): void;
        switchAnimation(_name: ANIMATIONSTATES): void;
    }
    enum ANIMATIONSTATES {
        IDLE = 0,
        WALK = 1,
        SUMMON = 2,
        ATTACK = 3
    }
    enum BEHAVIOUR {
        IDLE = 0,
        FOLLOW = 1,
        FLEE = 2,
        SUMMON = 3,
        ATTACK = 4
    }
    enum ID {
        RANGED = "ranged",
        MELEE = "melee",
        BAT = "bat",
        REDTICK = "redtick",
        SMALLTICK = "smalltick",
        SKELETON = "skeleton",
        OGER = "oger",
        SUMMONOR = "summonor"
    }
    function getNameById(_id: Entity.ID): string;
}
declare namespace Enemy {
    enum ENEMYCLASS {
        ENEMYDUMB = 0,
        ENEMYDASH = 1,
        ENEMYSMASH = 2,
        ENEMYPATROL = 3,
        ENEMYSHOOT = 4,
        SUMMONOR = 5,
        SUMMONORADDS = 6
    }
    class Enemy extends Entity.Entity implements Interfaces.IKnockbackable {
        currentBehaviour: Entity.BEHAVIOUR;
        target: ƒ.Vector2;
        lifetime: number;
        moveDirection: Game.ƒ.Vector3;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        move(_direction: ƒ.Vector3): void;
        moveBehaviour(): void;
        moveSimple(_target: ƒ.Vector2): ƒ.Vector2;
        moveAway(_target: ƒ.Vector2): ƒ.Vector2;
        die(): void;
        collide(_direction: ƒ.Vector3): void;
    }
    class EnemyDumb extends Enemy {
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        behaviour(): void;
        moveBehaviour(): void;
    }
    class EnemySmash extends Enemy {
        isAttacking: boolean;
        coolDown: Ability.Cooldown;
        avatars: Player.Player[];
        randomPlayer: number;
        currentBehaviour: Entity.BEHAVIOUR;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        behaviour(): void;
        moveBehaviour(): void;
    }
    class EnemyDash extends Enemy {
        protected dash: Ability.Dash;
        lastMoveDireciton: Game.ƒ.Vector3;
        dashCount: number;
        avatars: Player.Player[];
        randomPlayer: number;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        behaviour(): void;
        moveBehaviour(): void;
    }
    class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[];
        waitTime: number;
        currenPointIndex: number;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        moveBehaviour(): void;
        patrol(): void;
    }
    class EnemyShoot extends Enemy {
        viewRadius: number;
        gotRecognized: boolean;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        moveBehaviour(): void;
        getDamage(_value: number): void;
        shoot(_netId?: number): void;
    }
    class SummonorAdds extends EnemyDash {
        avatar: Player.Player;
        randomPlayer: number;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _target: Player.Player, _netId?: number);
        update(): void;
        behaviour(): void;
        moveBehaviour(): void;
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
    interface InputPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
    }
    interface StatePayload {
        tick: number;
        position: Game.ƒ.Vector3;
    }
}
declare namespace Items {
    enum ITEMID {
        ICEBUCKETCHALLENGE = 0,
        DMGUP = 1,
        SPEEDUP = 2,
        PROJECTILESUP = 3,
        HEALTHUP = 4,
        SCALEUP = 5,
        SCALEDOWN = 6,
        ARMORUP = 7,
        HOMECOMING = 8,
        TOXICRELATIONSHIP = 9,
        VAMPY = 10,
        SLOWYSLOW = 11
    }
    let txtIceBucket: ƒ.TextureImage;
    let txtDmgUp: ƒ.TextureImage;
    let txtHealthUp: ƒ.TextureImage;
    let txtToxicRelationship: ƒ.TextureImage;
    abstract class Item extends Game.ƒ.Node {
        tag: Tag.TAG;
        id: ITEMID;
        netId: number;
        description: string;
        imgSrc: string;
        collider: Collider.Collider;
        transform: ƒ.ComponentTransform;
        position: ƒ.Vector2;
        buff: Buff.Buff[];
        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number);
        getBuffById(): Buff.Buff;
        loadTexture(_texture: ƒ.TextureImage): Promise<void>;
        setTextureById(): void;
        setPosition(_position: ƒ.Vector2): void;
        despawn(): void;
        doYourThing(_avatar: Player.Player): void;
    }
    class InternalItem extends Item {
        value: number;
        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number);
        doYourThing(_avatar: Player.Player): void;
        setAttributesById(_avatar: Player.Player): void;
    }
    class BuffItem extends Item {
        value: number;
        tickRate: number;
        duration: number;
        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number);
        doYourThing(_avatar: Player.Player): void;
        setBuffById(_avatar: Entity.Entity): void;
    }
    function getInternalItemById(_id: ITEMID): Items.InternalItem;
    function getBuffItemById(_id: ITEMID): Items.BuffItem;
}
declare namespace AnimationGeneration {
    export let txtRedTickIdle: ƒ.TextureImage;
    export let txtRedTickWalk: ƒ.TextureImage;
    export let txtSmallTickIdle: ƒ.TextureImage;
    export let txtSmallTickWalk: ƒ.TextureImage;
    export let txtBatIdle: ƒ.TextureImage;
    export let txtSkeletonIdle: ƒ.TextureImage;
    export let txtSkeletonWalk: ƒ.TextureImage;
    export let txtOgerIdle: ƒ.TextureImage;
    export let txtOgerWalk: ƒ.TextureImage;
    export let txtOgerAttack: ƒ.TextureImage;
    export import ƒAid = FudgeAid;
    export class AnimationContainer {
        id: Entity.ID;
        animations: ƒAid.SpriteSheetAnimations;
        scale: [string, number][];
        frameRate: [string, number][];
        constructor(_id: Entity.ID);
        addAnimation(_ani: ƒAid.SpriteSheetAnimation, _scale: number, _frameRate: number): void;
        getAnimationById(): void;
    }
    class MyAnimationClass {
        id: Entity.ID;
        animationName: string;
        spriteSheet: ƒ.TextureImage;
        amountOfFrames: number;
        frameRate: number;
        generatedSpriteAnimation: ƒAid.SpriteSheetAnimation;
        animationScale: number;
        constructor(_id: Entity.ID, _animationName: string, _txtIdle: ƒ.TextureImage, _amountOfFrames: number, _frameRate: number);
    }
    export function generateAnimationObjects(): void;
    export function getAnimationById(_id: Entity.ID): AnimationContainer;
    export function generateAnimationFromGrid(_class: MyAnimationClass): void;
    export {};
}
declare namespace Networking {
    abstract class Prediction {
        protected timer: number;
        protected currentTick: number;
        protected minTimeBetweenTicks: number;
        protected gameTickRate: number;
        protected bufferSize: number;
        protected ownerNetId: number;
        get owner(): Entity.Entity;
        protected stateBuffer: Interfaces.StatePayload[];
        constructor(_ownerNetId: number);
        protected handleTick(): void;
        protected processMovement(input: Interfaces.InputPayload): Interfaces.StatePayload;
    }
    class ClientPrediction extends Prediction {
        private inputBuffer;
        private latestServerState;
        private lastProcessedState;
        private horizontalInput;
        private verticalInput;
        private AsyncTolerance;
        constructor(_ownerNetId: number);
        update(): void;
        protected handleTick(): void;
        onServerMovementState(_serverState: Interfaces.StatePayload): void;
        private handleServerReconciliation;
    }
    class ServerPrediction extends Prediction {
        private inputQueue;
        constructor(_ownerNetId: number);
        updateEntityToCheck(_netId: number): void;
        update(): void;
        handleTick(): void;
        onClientInput(inputPayload: Interfaces.InputPayload): void;
    }
}
declare namespace Ability {
    abstract class Ability {
        protected ownerNetId: number;
        get owner(): Entity.Entity;
        protected cooldown: Cooldown;
        protected abilityCount: number;
        protected currentabilityCount: number;
        protected duration: number;
        doesAbility: boolean;
        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number);
        doAbility(): void;
        protected activateAbility(): void;
        protected deactivateAbility(): void;
    }
    class Block extends Ability {
        protected activateAbility(): void;
        protected deactivateAbility(): void;
    }
    class Dash extends Ability {
        speed: number;
        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number, _speed: number);
        protected activateAbility(): void;
        protected deactivateAbility(): void;
    }
    class SpawnSummoners extends Ability {
        protected activateAbility(): void;
        protected deactivateAbility(): void;
    }
    class Cooldown {
        hasCoolDown: boolean;
        private coolDown;
        private currentCooldown;
        constructor(_number: number);
        startCoolDown(): void;
        private endCoolDOwn;
        updateCoolDown(): void;
    }
}
declare namespace Entity {
    class Attributes {
        healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number;
        hitable: boolean;
        armor: number;
        speed: number;
        attackPoints: number;
        coolDownReduction: number;
        scale: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _armor: number, _cooldownReduction?: number);
        updateScaleDependencies(): void;
    }
}
declare namespace Enemy {
    class Summonor extends EnemyShoot {
        damageTaken: number;
        beginDefencePhase: boolean;
        defencePhaseTime: number;
        defencePhaseCurrentTime: number;
        summonChance: number;
        summonCooldown: number;
        summonCurrentCooldown: number;
        private summon;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        cooldown(): void;
        behaviour(): void;
        getDamage(_value: number): void;
        moveBehaviour(): void;
        attackingPhase(): void;
        defencePhase(): void;
    }
}
declare namespace Buff {
    enum BUFFID {
        BLEEDING = 0,
        POISON = 1,
        HEAL = 2,
        SLOW = 3
    }
    abstract class Buff {
        duration: number;
        tickRate: number;
        id: BUFFID;
        protected noDuration: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number);
        getParticleById(_id: BUFFID): UI.Particles;
        clone(): Buff;
        applyBuff(_avatar: Entity.Entity): void;
        addToEntity(_avatar: Entity.Entity): void;
        doBuffStuff(_avatar: Entity.Entity): boolean;
    }
    class DamageBuff extends Buff {
        value: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number);
        clone(): DamageBuff;
        doBuffStuff(_avatar: Entity.Entity): boolean;
        applyBuff(_avatar: Entity.Entity): void;
        getBuffDamgeById(_id: BUFFID, _avatar: Entity.Entity): void;
    }
    class AttributesBuff extends Buff {
        isBuffApplied: boolean;
        value: number;
        removedValue: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number);
        clone(): AttributesBuff;
        doBuffStuff(_avatar: Entity.Entity): boolean;
        removeBuff(_avatar: Entity.Entity): void;
        applyBuff(_avatar: Entity.Entity): void;
        getBuffAttributeById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean): void;
    }
}
declare namespace Bullets {
    enum BULLETTYPE {
        STANDARD = 0,
        HIGHSPEED = 1,
        SLOW = 2,
        MELEE = 3
    }
    let bulletTxt: ƒ.TextureImage;
    class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        tag: Tag.TAG;
        owner: number;
        get _owner(): Entity.Entity;
        netId: number;
        tick: number;
        positions: ƒ.Vector3[];
        hostPositions: ƒ.Vector3[];
        flyDirection: ƒ.Vector3;
        direction: ƒ.Vector3;
        collider: Collider.Collider;
        hitPointsScale: number;
        speed: number;
        lifetime: number;
        knockbackForce: number;
        type: BULLETTYPE;
        time: number;
        killcount: number;
        despawn(): Promise<void>;
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _netId?: number);
        update(): Promise<void>;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void;
        updateRotation(_direction: ƒ.Vector3): void;
        bulletPrediction(): void;
        correctPosition(): Promise<void>;
        loadTexture(): void;
        setBuff(_target: Entity.Entity): void;
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
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _target?: ƒ.Vector3, _netId?: number);
        update(): Promise<void>;
        setTarget(_netID: number): void;
        calculateHoming(): void;
    }
}
declare namespace Collider {
    class Collider {
        ownerNetId: number;
        radius: number;
        position: ƒ.Vector2;
        get top(): number;
        get left(): number;
        get right(): number;
        get bottom(): number;
        constructor(_position: ƒ.Vector2, _radius: number, _netId: number);
        collides(_collider: Collider): boolean;
        collidesRect(_collider: Game.ƒ.Rectangle): boolean;
        getIntersection(_collider: Collider): number;
        getIntersectionRect(_collider: ƒ.Rectangle): ƒ.Rectangle;
    }
}
declare namespace EnemySpawner {
    function spawnEnemies(): void;
    function spawnByID(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _attributes?: Entity.Attributes, _target?: Player.Player, _netID?: number): void;
    function networkSpawnById(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _attributes: Entity.Attributes, _netID: number, _target?: number): void;
}
declare namespace Calculation {
    function getCloserAvatarPosition(_startPoint: ƒ.Vector3): ƒ.Vector3;
    function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number;
    function getRotatedVectorByAngle2D(_vectorToRotate: ƒ.Vector3, _angle: number): ƒ.Vector3;
    function addPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number;
    function subPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number;
}
declare namespace InputSystem {
    function calcPositionFromDegree(_degrees: number, _distance: number): ƒ.Vector2;
    function move(): Game.ƒ.Vector3;
}
declare namespace Level {
    class Landscape extends ƒ.Node {
        constructor(_name: string);
    }
}
declare namespace Networking {
    enum FUNCTION {
        CONNECTED = 0,
        SETGAMESTATE = 1,
        LOADED = 2,
        HOST = 3,
        SETREADY = 4,
        SPAWN = 5,
        TRANSFORM = 6,
        CLIENTMOVEMENT = 7,
        SERVERBUFFER = 8,
        UPDATEINVENTORY = 9,
        KNOCKBACKREQUEST = 10,
        KNOCKBACKPUSH = 11,
        SPAWNBULLET = 12,
        BULLETPREDICTION = 13,
        BULLETTRANSFORM = 14,
        BULLETDIE = 15,
        SPAWNENEMY = 16,
        ENEMYTRANSFORM = 17,
        ENTITYANIMATIONSTATE = 18,
        ENEMYDIE = 19,
        SPAWNINTERNALITEM = 20,
        UPDATEATTRIBUTES = 21,
        UPDATEWEAPON = 22,
        ITEMDIE = 23,
        SENDROOM = 24,
        SWITCHROOMREQUEST = 25,
        UPDATEBUFF = 26,
        UPDATEUI = 27
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
    function connecting(): void;
    function setClientReady(): void;
    function setGamestate(_playing: boolean): void;
    function setHost(): void;
    function loaded(): void;
    function spawnPlayer(_type?: Player.PLAYERTYPE): void;
    function setClient(): void;
    function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3): void;
    function sendClientInput(_netId: number, _inputPayload: Interfaces.InputPayload): void;
    function sendServerBuffer(_netId: number, _buffer: Interfaces.StatePayload): void;
    function knockbackRequest(_netId: number, _knockbackForce: number, _position: Game.ƒ.Vector3): void;
    function knockbackPush(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    function updateInventory(_itemId: Items.ITEMID, _itemNetId: number, _netId: number): void;
    function spawnBullet(_aimType: Weapons.AIM, _direction: ƒ.Vector3, _bulletNetId: number, _ownerNetId: number, _bulletTarget?: ƒ.Vector3): void;
    function updateBullet(_position: ƒ.Vector3, _rotation: ƒ.Vector3, _netId: number, _tick?: number): void;
    function predictionBullet(_position: ƒ.Vector3, _netId: number, _tick?: number): void;
    function removeBullet(_netId: number): void;
    function spawnEnemy(_enemyClass: Enemy.ENEMYCLASS, _enemy: Enemy.Enemy, _netId: number): void;
    function updateEnemyPosition(_position: ƒ.Vector3, _netId: number): void;
    function updateEntityAnimationState(_state: Entity.ANIMATIONSTATES, _netId: number): void;
    function removeEnemy(_netId: number): void;
    function spawnItem(_item: Items.Item, _id: number, _position: ƒ.Vector2, _netId: number): void;
    function updateEntityAttributes(_attributes: Entity.Attributes, _netId: number): void;
    function updateAvatarWeapon(_weapon: Weapons.Weapon, _targetNetId: number): void;
    function removeItem(_netId: number): void;
    function updateBuffList(_buffList: Buff.Buff[], _netId: number): void;
    function updateUI(_position: Game.ƒ.Vector2, _value: number): void;
    function sendRoom(_name: string, _coordiantes: [number, number], _exits: [boolean, boolean, boolean, boolean], _roomType: Generation.ROOMTYPE, _direciton?: [boolean, boolean, boolean, boolean]): void;
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
        weapon: Weapons.Weapon;
        client: Networking.ClientPrediction;
        server: Networking.ServerPrediction;
        readonly abilityCount: number;
        currentabilityCount: number;
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _netId?: number);
        move(_direction: ƒ.Vector3): void;
        predict(): void;
        collide(_direction: Game.ƒ.Vector3): void;
        getItemCollision(): void;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void;
        doAbility(): void;
    }
    class Melee extends Player {
        protected block: Ability.Block;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        weapon: Weapons.Weapon;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doAbility(): void;
    }
    class Ranged extends Player {
        private dash;
        performAbility: boolean;
        lastMoveDirection: Game.ƒ.Vector3;
        move(_direction: ƒ.Vector3): void;
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
    let txtStartRoom: Game.ƒ.TextureImage;
    class Room extends ƒ.Node {
        tag: Tag.TAG;
        roomType: ROOMTYPE;
        coordinates: [number, number];
        walls: Wall[];
        doors: Door[];
        finished: boolean;
        enemyCount: number;
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
    function addRoomToGraph(_room: Room, _direciton?: [boolean, boolean, boolean, boolean]): void;
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
declare namespace Weapons {
    class Weapon {
        owner: number;
        get _owner(): Entity.Entity;
        protected cooldown: Ability.Cooldown;
        cooldownTime: number;
        protected attackCount: number;
        currentAttackCount: number;
        aimType: AIM;
        bulletType: Bullets.BULLETTYPE;
        projectileAmount: number;
        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number, _aimType: AIM);
        shoot(_position: ƒ.Vector2, _direciton: ƒ.Vector3, _bulletNetId?: number, _sync?: boolean): void;
        fire(_magazine: Bullets.Bullet[], _sync?: boolean): void;
        setBulletDirection(_magazine: Bullets.Bullet[]): Bullets.Bullet[];
        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.BULLETTYPE, _netId?: number): Bullets.Bullet[];
    }
    enum AIM {
        NORMAL = 0,
        HOMING = 1
    }
}
