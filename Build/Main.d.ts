/// <reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts" />
/// <reference types="../fudge/aid/build/fudgeaid.js" />
/// <reference types="../fudge/core/build/fudgecore.js" />
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
    let cmpCamera: ƒ.ComponentCamera;
    let graph: ƒ.Node;
    let runs: number;
    let newGamePlus: number;
    let avatar1: Player.Player;
    let avatar2: Player.Player;
    let currentRoom: Generation.Room;
    let miniMap: UI.Minimap;
    let deltaTime: number;
    let serverPredictionAvatar: Networking.ServerPrediction;
    let currentNetObj: Interfaces.INetworkObjects[];
    let entities: Entity.Entity[];
    let enemies: Enemy.Enemy[];
    let bullets: Bullets.Bullet[];
    let items: Items.Item[];
    let coolDowns: Ability.Cooldown[];
    let enemiesJSON: Entity.Entity[];
    let avatarsJSON: Entity.Entity[];
    let internalItemJSON: Items.InternalItem[];
    let buffItemJSON: Items.BuffItem[];
    let damageBuffJSON: Buff.DamageBuff[];
    let attributeBuffJSON: Buff.AttributesBuff[];
    let bulletsJSON: Bullets.Bullet[];
    let loaded: boolean;
    function setMiniMap(): void;
    function pause(_sync: boolean, _triggerOption: boolean): void;
    function playing(_sync: boolean, _triggerOption: boolean): void;
    function loadTextures(): Promise<void>;
    function cameraUpdate(): void;
}
declare namespace Ability {
    abstract class Ability {
        protected ownerNetId: number;
        get owner(): Entity.Entity;
        protected cooldown: Cooldown;
        get getCooldown(): Cooldown;
        protected abilityCount: number;
        protected currentabilityCount: number;
        protected duration: Cooldown;
        doesAbility: boolean;
        onDoAbility: () => void;
        onEndAbility: () => void;
        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number);
        eventUpdate: (_event: Event) => void;
        protected updateAbility(): void;
        doAbility(): void;
        hasCooldown(): boolean;
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
        private spawnRadius;
        protected activateAbility(): void;
    }
    class circleShoot extends Ability {
        bulletAmount: number;
        private bullets;
        protected activateAbility(): void;
    }
    class Stomp extends Ability {
        bulletAmount: number;
        private bullets;
        protected activateAbility(): void;
        protected generateSpawnPoints(): Game.ƒ.Vector2[];
    }
    class Cooldown {
        hasCooldown: boolean;
        private cooldown;
        get getMaxCoolDown(): number;
        set setMaxCoolDown(_param: number);
        private currentCooldown;
        get getCurrentCooldown(): number;
        onEndCooldown: () => void;
        constructor(_number: number);
        startCooldown(): void;
        private endCooldown;
        resetCooldown(): void;
        eventUpdate: (_event: Event) => void;
        updateCooldown(): void;
    }
}
declare namespace UI {
    function updateUI(): void;
    function itemPopUp(_item: Items.Item): void;
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
        lifespan(): Promise<void>;
        constructor(_position: ƒ.Vector3, _damage: number);
        update: (_event: Event) => void;
        move(): Promise<void>;
        loadTexture(_damage: number): void;
    }
    let healParticle: ƒ.TextureImage;
    let poisonParticle: ƒ.TextureImage;
    let burnParticle: ƒ.TextureImage;
    let bleedingParticle: ƒ.TextureImage;
    let slowParticle: ƒ.TextureImage;
    let immuneParticle: ƒ.TextureImage;
    let furiousParticle: ƒ.TextureImage;
    let exhaustedParticle: ƒ.TextureImage;
    let commonParticle: ƒ.TextureImage;
    let rareParticle: ƒ.TextureImage;
    let epicParticle: ƒ.TextureImage;
    let legendaryParticle: ƒ.TextureImage;
    class Particles extends Game.ƒAid.NodeSprite {
        id: Buff.BUFFID | Items.RARITY;
        animationParticles: Game.ƒAid.SpriteSheetAnimation;
        particleframeNumber: number;
        particleframeRate: number;
        width: number;
        height: number;
        constructor(_id: Buff.BUFFID | Items.RARITY, _texture: Game.ƒ.TextureImage, _frameCount: number, _frameRate: number);
    }
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
        OBSTICAL = 7,
        UI = 8
    }
}
declare namespace Entity {
    class Entity extends Game.ƒAid.NodeSprite implements Interfaces.INetworkable {
        protected currentAnimationState: ANIMATIONSTATES;
        private performKnockback;
        tag: Tag.TAG;
        netId: number;
        netObjectNode: ƒ.Node;
        id: Entity.ID;
        attributes: Attributes;
        collider: Collider.Collider;
        items: Array<Items.Item>;
        buffs: Buff.Buff[];
        offsetColliderX: number;
        offsetColliderY: number;
        colliderScaleFaktor: number;
        weapon: Weapons.Weapon;
        protected canMoveX: boolean;
        protected canMoveY: boolean;
        protected moveDirection: Game.ƒ.Vector3;
        protected animationContainer: AnimationGeneration.AnimationContainer;
        protected idleScale: number;
        protected currentKnockback: ƒ.Vector3;
        shadow: Shadow;
        spriteScaleFactor: number;
        shadowOffsetY: number;
        shadowOffsetX: number;
        constructor(_id: Entity.ID, _netId: number);
        eventUpdate: (_event: Event) => void;
        update(): void;
        updateScale(_newScale: number, _updateScaleDependencies: boolean): void;
        setCollider(): void;
        protected updateBuffs(): void;
        protected collide(_direction: ƒ.Vector3): void;
        protected calculateCollision(_collider: Collider.Collider[] | Game.ƒ.Rectangle[], _direction: ƒ.Vector3): void;
        /**
         * does Damage to the Entity
         * @param _value value how much damage is applied
         */
        getDamage(_value: number): void;
        die(): void;
        private getDamageReduction;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        protected reduceKnockback(): void;
        switchAnimation(_name: ANIMATIONSTATES): void;
    }
    enum ANIMATIONSTATES {
        IDLE = 0,
        IDLELEFT = 1,
        WALK = 2,
        WALKLEFT = 3,
        SUMMON = 4,
        ATTACK = 5,
        TELEPORT = 6
    }
    enum BEHAVIOUR {
        IDLE = 0,
        FOLLOW = 1,
        FLEE = 2,
        SUMMON = 3,
        ATTACK = 4,
        TELEPORT = 5
    }
    enum ID {
        RANGED = 0,
        MELEE = 1,
        MERCHANT = 2,
        BAT = 3,
        REDTICK = 4,
        SMALLTICK = 5,
        SKELETON = 6,
        OGER = 7,
        SUMMONER = 8,
        BIGBOOM = 9
    }
    function getNameById(_id: Entity.ID): string;
}
declare namespace Enemy {
    enum ENEMYCLASS {
        ENEMYDUMB = 0,
        ENEMYCIRCLE = 1,
        ENEMYDASH = 2,
        ENEMYSMASH = 3,
        ENEMYPATROL = 4,
        ENEMYSHOOT = 5,
        SUMMONER = 6,
        BIGBOOM = 7,
        SUMMONORADDS = 8
    }
    enum ENEMYBEHAVIOUR {
        IDLE = 0,
        WALK = 1,
        SUMMON = 2,
        ATTACK = 3,
        TELEPORT = 4,
        SHOOT360 = 5,
        SHOOT = 6,
        SMASH = 7,
        STOMP = 8,
        DASH = 9
    }
    import ƒAid = FudgeAid;
    abstract class Enemy extends Entity.Entity implements Interfaces.IKnockbackable, Game.ƒAid.StateMachine<ENEMYBEHAVIOUR> {
        currentBehaviour: Entity.BEHAVIOUR;
        target: ƒ.Vector2;
        moveDirection: Game.ƒ.Vector3;
        protected abstract flocking: FlockingBehaviour;
        protected isAggressive: boolean;
        protected canThinkCoolDown: Ability.Cooldown;
        protected canThink: boolean;
        stateNext: ENEMYBEHAVIOUR;
        stateCurrent: ENEMYBEHAVIOUR;
        instructions: ƒAid.StateMachineInstructions<ENEMYBEHAVIOUR>;
        protected stateMachineInstructions: Game.ƒAid.StateMachineInstructions<ENEMYBEHAVIOUR>;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number);
        act(): void;
        transit(_next: ENEMYBEHAVIOUR): void;
        protected startThinkin: () => void;
        update(): void;
        getDamage(_value: number): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
        move(_direction: ƒ.Vector3): void;
        moveSimple(_target: ƒ.Vector2): ƒ.Vector2;
        moveAway(_target: ƒ.Vector2): ƒ.Vector2;
        die(): void;
        collide(_direction: ƒ.Vector3): void;
    }
    class EnemyCircle extends Enemy {
        flocking: FlockingBehaviour;
        private circleRadius;
        private circleDirection;
        private circleTolerance;
        constructor(_id: Entity.ID, _pos: Game.ƒ.Vector2, _netId: number);
        private getCircleDirection;
        update(): void;
        private walkAI;
        private getCloser;
        private getFurtherAway;
        private walkCircle;
    }
    class EnemyDumb extends Enemy {
        protected flocking: FlockingBehaviour;
        private aggressiveDistance;
        private stamina;
        private recover;
        constructor(_id: Entity.ID, _pos: Game.ƒ.Vector2, _netId: number);
        update(): void;
        private checkAggressiveState;
        private OnStaminaCooldownEnd;
        private OnRecoverCooldownEnd;
        private startIdling;
        die(): void;
        private idle;
        private startWalking;
        private walk;
    }
    class EnemySmash extends Enemy {
        coolDown: Ability.Cooldown;
        avatars: Player.Player[];
        randomPlayer: number;
        currentBehaviour: Entity.BEHAVIOUR;
        protected flocking: FlockingBehaviour;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId: number);
        behaviour(): void;
        moveBehaviour(): void;
    }
    class EnemyDash extends Enemy {
        protected dash: Ability.Dash;
        protected lastMoveDireciton: Game.ƒ.Vector3;
        protected dashDistance: number;
        protected dashCount: number;
        protected flocking: FlockingBehaviour;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        private startDash;
        private doDash;
        private onEndDash;
        protected walk: () => void;
    }
    class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[];
        waitTime: number;
        currenPointIndex: number;
        protected flocking: FlockingBehaviour;
        moveBehaviour(): void;
        patrol(): void;
    }
    class EnemyShoot extends Enemy {
        distanceToPlayer: number;
        protected flocking: FlockingBehaviour;
        private distance;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number);
        update(): void;
        private flee;
        private shoot;
        private idle;
    }
    class SummonorAdds extends EnemyDash {
        avatar: Player.Player;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _target: Player.Player, _netId?: number);
        protected walk: () => void;
    }
    function getEnemyClass(_enemy: Enemy.Enemy): ENEMYCLASS;
}
declare namespace Interfaces {
    interface ISpawnable {
        lifetime?: number;
        despawn(): void;
    }
    interface IKnockbackable {
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }
    interface IKillable {
        onDeath(): void;
    }
    interface IDamageable {
        getDamage(): void;
    }
    interface IAttributeValuePayload {
        value: Entity.Attributes;
    }
    interface INetworkable {
        netId: number;
    }
    interface INetworkObjects {
        netId: number;
        netObjectNode: Game.ƒ.Node;
    }
    interface IInputBulletPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
        rotation: Game.ƒ.Vector3;
    }
    interface IInputAvatarPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
        doesAbility: boolean;
    }
    interface IStatePayload {
        tick: number;
        position: Game.ƒ.Vector3;
        rotation: Game.ƒ.Vector3;
    }
    interface IMagazin {
        bulletTypes: Bullets.BULLETTYPE[];
        directions: Game.ƒ.Vector2[];
        ownerNetId: number;
        netIds: number[];
        targets?: ƒ.Vector3[];
    }
    interface IRoomExits {
        north: boolean;
        east: boolean;
        south: boolean;
        west: boolean;
    }
    interface IRoom {
        coordinates: Game.ƒ.Vector2;
        roomSize: number;
        exits: IRoomExits;
        roomType: Generation.ROOMTYPE;
        translation: Game.ƒ.Vector3;
    }
    interface IMinimapInfos {
        coords: Game.ƒ.Vector2;
        roomType: Generation.ROOMTYPE;
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
        SLOWYSLOW = 11,
        THORSHAMMER = 12,
        GETSTRONKO = 13,
        GETWEAKO = 14,
        ZIPZAP = 15,
        AOETEST = 16
    }
    let txtIceBucket: ƒ.TextureImage;
    let txtDmgUp: ƒ.TextureImage;
    let txtSpeedUp: ƒ.TextureImage;
    let txtProjectilesUp: ƒ.TextureImage;
    let txtHealthUp: ƒ.TextureImage;
    let txtScaleUp: ƒ.TextureImage;
    let txtScaleDown: ƒ.TextureImage;
    let txtHomeComing: ƒ.TextureImage;
    let txtThorsHammer: ƒ.TextureImage;
    let txtToxicRelationship: ƒ.TextureImage;
    let txtGetStronko: ƒ.TextureImage;
    let txtGetWeako: ƒ.TextureImage;
    abstract class Item extends Game.ƒ.Node {
        tag: Tag.TAG;
        id: ITEMID;
        rarity: RARITY;
        netId: number;
        description: string;
        imgSrc: string;
        collider: Collider.Collider;
        transform: ƒ.ComponentTransform;
        private position;
        get getPosition(): ƒ.Vector2;
        buff: Buff.Buff[];
        protected changedValue: number;
        constructor(_id: ITEMID, _netId?: number);
        clone(): Item;
        protected addRarityBuff(): void;
        protected getBuffById(): Buff.Buff;
        protected loadTexture(_texture: ƒ.TextureImage): void;
        protected setTextureById(): void;
        setPosition(_position: ƒ.Vector2): void;
        spawn(): void;
        despawn(): void;
        addItemToEntity(_avatar: Player.Player): void;
        removeItemFromEntity(_avatar: Player.Player): void;
    }
    class InternalItem extends Item {
        value: number;
        choosenOneNetId: number;
        constructor(_id: ITEMID, _netId?: number);
        setChoosenOneNetId(_netId: number): void;
        addItemToEntity(_avatar: Player.Player): void;
        removeItemFromEntity(_avatar: Player.Player): void;
        clone(): Item;
        protected setAttributesById(_avatar: Player.Player, _addBuff: boolean): void;
    }
    class BuffItem extends Item {
        value: number;
        tickRate: number;
        duration: number;
        constructor(_id: ITEMID, _netId?: number);
        addItemToEntity(_avatar: Player.Player): void;
        clone(): BuffItem;
        setBuffById(_avatar: Entity.Entity): void;
    }
    function getInternalItemById(_id: ITEMID): Items.InternalItem;
    function getBuffItemById(_id: ITEMID): Items.BuffItem;
    abstract class ItemGenerator {
        private static itemPool;
        static fillPool(): void;
        static getRandomItem(): Items.Item;
        static getRandomItemByRarity(_rarity: RARITY): Items.Item;
        private static getPossibleItems;
        private static getRarity;
    }
    enum RARITY {
        COMMON = 0,
        RARE = 1,
        EPIC = 2,
        LEGENDARY = 3
    }
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
    export let txtSummonerIdle: ƒ.TextureImage;
    export let txtSummonerSummon: ƒ.TextureImage;
    export let txtSummonerTeleport: ƒ.TextureImage;
    export let txtRangedIdle: ƒ.TextureImage;
    export let txtRangedWalk: ƒ.TextureImage;
    export let txtRangedIdleLeft: ƒ.TextureImage;
    export let txtRangedWalkLeft: ƒ.TextureImage;
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
        constructor(_id: Entity.ID, _animationName: string, _texture: ƒ.TextureImage, _amountOfFrames: number, _frameRate: number);
    }
    export function generateAnimationObjects(): void;
    export function getAnimationById(_id: Entity.ID): AnimationContainer;
    export function generateAnimationFromGrid(_class: MyAnimationClass): void;
    export {};
}
declare namespace Networking {
    export abstract class Prediction {
        protected timer: number;
        protected currentTick: number;
        minTimeBetweenTicks: number;
        protected gameTickRate: number;
        protected bufferSize: number;
        protected ownerNetId: number;
        get owner(): Game.ƒ.Node;
        protected stateBuffer: Interfaces.IStatePayload[];
        constructor(_ownerNetId: number);
        protected handleTick(): void;
        protected processMovement(_input: Interfaces.IInputAvatarPayload | Interfaces.IInputBulletPayload): Interfaces.IStatePayload;
    }
    abstract class BulletPrediction extends Prediction {
        protected processMovement(input: Interfaces.IInputBulletPayload): Interfaces.IStatePayload;
    }
    export class ServerBulletPrediction extends BulletPrediction {
        private inputQueue;
        updateEntityToCheck(_netId: number): void;
        update(): void;
        handleTick(): void;
        onClientInput(inputPayload: Interfaces.IInputBulletPayload): void;
    }
    export class ClientBulletPrediction extends BulletPrediction {
        private inputBuffer;
        private latestServerState;
        private lastProcessedState;
        private flyDirection;
        private AsyncTolerance;
        constructor(_ownerNetId: number);
        update(): void;
        protected handleTick(): void;
        onServerMovementState(_serverState: Interfaces.IStatePayload): void;
        private handleServerReconciliation;
    }
    abstract class AvatarPrediction extends Prediction {
        protected processMovement(input: Interfaces.IInputAvatarPayload): Interfaces.IStatePayload;
    }
    export class ClientPrediction extends AvatarPrediction {
        private inputBuffer;
        private latestServerState;
        private lastProcessedState;
        private horizontalInput;
        private verticalInput;
        protected doesAbility: boolean;
        private AsyncTolerance;
        constructor(_ownerNetId: number);
        update(): void;
        protected handleTick(): void;
        switchAvatarAbilityState(): void;
        onServerMovementState(_serverState: Interfaces.IStatePayload): void;
        private handleServerReconciliation;
    }
    export class ServerPrediction extends AvatarPrediction {
        private inputQueue;
        updateEntityToCheck(_netId: number): void;
        update(): void;
        handleTick(): void;
        onClientInput(inputPayload: Interfaces.IInputAvatarPayload): void;
    }
    export {};
}
declare namespace Ability {
    enum AOETYPE {
        HEALTHUP = 0
    }
    class AreaOfEffect extends Game.ƒ.Node implements Interfaces.INetworkable {
        netId: number;
        id: AOETYPE;
        private position;
        get getPosition(): Game.ƒ.Vector2;
        set setPosition(_pos: Game.ƒ.Vector2);
        private collider;
        get getCollider(): Collider.Collider;
        private duration;
        private areaMat;
        private ownerNetId;
        private buffList;
        get getBuffList(): Buff.Buff[];
        private damageValue;
        constructor(_id: AOETYPE, _netId: number);
        eventUpdate: (_event: Event) => void;
        protected update(): void;
        despawn: () => void;
        protected spawn(_entity: Entity.Entity): void;
        addToEntity(_entity: Entity.Entity): void;
        protected collisionDetection(): void;
        protected applyAreaOfEffect(_entity: Entity.Entity): void;
    }
}
declare namespace Entity {
    enum ATTRIBUTETYPE {
        HEALTHPOINTS = 0,
        MAXHEALTHPOINTS = 1,
        KNOCKBACKFORCE = 2,
        HITABLE = 3,
        ARMOR = 4,
        SPEED = 5,
        ATTACKPOINTS = 6,
        COOLDOWNREDUCTION = 7,
        SCALE = 8
    }
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
        get getScale(): number;
        accuracy: number;
        protected readonly baseMaxHealthPoints: number;
        protected readonly baseHealthPoints: number;
        protected readonly baseAttackPoints: number;
        protected readonly baseSpeed: number;
        protected readonly baseKnockbackForce: number;
        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _armor: number, _cooldownReduction: number, _accuracy: number);
        updateScaleDependencies(_newScale: number): void;
        private newGameFactor;
    }
}
declare namespace Enemy {
    enum BIGBOOMBEHAVIOUR {
        IDLE = 0,
        WALK = 1,
        SMASH = 2,
        STOMP = 3
    }
    class BigBoom extends Enemy {
        damageTaken: number;
        normalPhaseCd: Ability.Cooldown;
        furiousPhaseCd: Ability.Cooldown;
        exhaustedPhaseCd: Ability.Cooldown;
        smashCd: Ability.Cooldown;
        smashRadius: number;
        weapon: Weapons.Weapon;
        private stomp;
        private dash;
        protected flocking: FlockingBehaviour;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number);
        die(): void;
        private intro;
        private walking;
        private nextAttack;
        private throwStone;
        private doStomp;
        private doSmash;
        private idlePhase;
        private startFuriousPhase;
        private stopFuriousPhase;
        private startExaustedPhase;
        private stopExaustedPhase;
        getDamage(_value: number): void;
    }
    class Summonor extends Enemy {
        damageTaken: number;
        attackPhaseCd: Ability.Cooldown;
        defencePhaseCd: Ability.Cooldown;
        shootingCount: number;
        currentShootingCount: number;
        teleportPosition: ƒ.Vector3;
        afterTeleportState: ENEMYBEHAVIOUR;
        dashDirection: number;
        weapon: Weapons.Weapon;
        private summon;
        private dash;
        private shoot360;
        private shoot360Cooldown;
        protected flocking: FlockingBehaviour;
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number);
        intro: () => void;
        getDamage(_value: number): void;
        die(): void;
        attackingPhase: () => void;
        private nextAttack;
        private doDash;
        private changeDashDirection;
        private shootOnDash;
        defencePhase: () => void;
        stopDefencePhase: () => void;
        /**
         * used to prepare Teleport
         * @param _nextState nextState after the Teleport is done
         * @param _teleportPosition teleportPosistion the Summoner is teleporting to
         */
        private teleport;
        private doTeleport;
        shooting360: () => void;
    }
}
declare namespace Buff {
    enum BUFFID {
        BLEEDING = 0,
        POISON = 1,
        HEAL = 2,
        SLOW = 3,
        IMMUNE = 4,
        SCALEUP = 5,
        SCALEDOWN = 6,
        FURIOUS = 7,
        EXHAUSTED = 8
    }
    abstract class Buff {
        duration: number;
        tickRate: number;
        id: BUFFID;
        protected noDuration: number;
        protected coolDown: Ability.Cooldown;
        constructor(_id: BUFFID, _duration: number, _tickRate: number);
        protected getParticleById(_id: BUFFID): UI.Particles;
        abstract clone(): Buff;
        protected applyBuff(_avatar: Entity.Entity): void;
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        removeBuff(_avatar: Entity.Entity): void;
        /**
         * only use this function to add buffs to entities
         * @param _avatar entity it should be add to
         * @returns
         */
        addToEntity(_avatar: Entity.Entity): void;
        /**
         * buff applies its buff stats to the entity and deletes itself when its duration is over
         * @param _avatar entity it should be add to
         */
        doBuffStuff(_avatar: Entity.Entity): void;
        protected getBuffStatsById(_id: Buff.BUFFID, _avatar: Entity.Entity, _add: boolean): void;
        protected addParticle(_avatar: Entity.Entity): void;
    }
    class RarityBuff {
        id: Items.RARITY;
        constructor(_id: Items.RARITY);
        addToItem(_item: Items.Item): void;
        private getParticleById;
        private addParticleToItem;
    }
    /**
     * creates a new Buff that does Damage to an Entity;
     */
    class DamageBuff extends Buff {
        value: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number);
        clone(): DamageBuff;
        doBuffStuff(_avatar: Entity.Entity): void;
        protected getBuffStatsById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean): void;
    }
    /**
     * creates a new Buff that changes an attribute of an Entity for the duration of the buff
     */
    class AttributesBuff extends Buff {
        private isBuffApplied;
        value: number;
        private difHealthPoints;
        private difMaxHealthPoints;
        private difArmor;
        private difSpeed;
        private difAttackPoints;
        private difCoolDownReduction;
        private difScale;
        private difAccurary;
        private difKnockback;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number);
        clone(): AttributesBuff;
        doBuffStuff(_avatar: Entity.Entity): void;
        protected getBuffStatsById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean): void;
    }
    function getBuffById(_id: BUFFID): Buff;
}
declare namespace Bullets {
    enum BULLETTYPE {
        STANDARD = 0,
        HIGHSPEED = 1,
        SLOW = 2,
        MELEE = 3,
        SUMMONER = 4,
        STONE = 5,
        THORSHAMMER = 6,
        ZIPZAP = 7
    }
    enum BULLETCLASS {
        NORMAL = 0,
        FALLING = 1,
        HOMING = 2
    }
    let bulletTxt: ƒ.TextureImage;
    let waterBallTxt: ƒ.TextureImage;
    let thorsHammerTxt: ƒ.TextureImage;
    abstract class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.INetworkable {
        tag: Tag.TAG;
        ownerNetId: number;
        get owner(): Entity.Entity;
        netId: number;
        clientPrediction: Networking.ClientBulletPrediction;
        serverPrediction: Networking.ServerBulletPrediction;
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
        hitted: Entity.Entity[];
        hittedCd: Ability.Cooldown[];
        texturePath: string;
        lastPosition: ƒ.Vector3;
        countCheckUpdate: number;
        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerNetId: number, _netId?: number);
        eventUpdate: (_event: Event) => void;
        protected update(): void;
        spawn(): void;
        despawn(): void;
        protected updateLifetime(): void;
        predict(): void;
        protected checkUpdate(): void;
        move(_direction: Game.ƒ.Vector3): void;
        protected updateRotation(_direction: ƒ.Vector3): void;
        protected spawnThorsHammer(): void;
        protected loadTexture(): void;
        setBuffToTarget(_target: Entity.Entity): void;
        protected offsetCollider(): void;
        private addHitted;
        private resetHitted;
        collisionDetection(): void;
    }
    class NormalBullet extends Bullet {
        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerNetId: number, _netId?: number);
    }
    class FallingBullet extends Bullet {
        private shadow;
        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _ownerNetId: number, _netId?: number);
        protected update(): void;
        move(_direction: ƒ.Vector3): void;
        protected generateZIndex(): number;
    }
    class HomingBullet extends Bullet {
        target: ƒ.Vector3;
        private rotateSpeed;
        constructor(_bullettype: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _target: ƒ.Vector3, _netId?: number);
        private getTarget;
        move(_direction: Game.ƒ.Vector3): void;
        setTarget(_netID: number): void;
        private calculateHoming;
    }
    class ZipZapObject extends Bullet {
        private nextTarget;
        private avatars;
        private playerSize;
        private counter;
        private tickHit;
        constructor(_ownerNetId: number, _netId: number);
        eventUpdate: (_event: Event) => void;
        protected update(): void;
        spawn(): void;
        despawn(): void;
        move(): void;
    }
}
declare namespace Collider {
    class Collider {
        ownerNetId: number;
        private radius;
        get getRadius(): number;
        position: ƒ.Vector2;
        get top(): number;
        get left(): number;
        get right(): number;
        get bottom(): number;
        constructor(_position: ƒ.Vector2, _radius: number, _netId: number);
        setPosition(_position: Game.ƒ.Vector2): void;
        setRadius(_newRadius: number): void;
        collides(_collider: Collider): boolean;
        collidesRect(_collider: Game.ƒ.Rectangle): boolean;
        getIntersection(_collider: Collider): number;
        getIntersectionRect(_collider: ƒ.Rectangle): ƒ.Rectangle;
    }
}
declare namespace EnemySpawner {
    function spawnMultipleEnemiesAtRoom(_maxEnemies: number, _roomPos: Game.ƒ.Vector2, _enemyClass?: Enemy.ENEMYCLASS): void;
    function spawnByID(_enemyClass: Enemy.ENEMYCLASS, _position: ƒ.Vector2, _target?: Player.Player, _netID?: number): void;
    function networkSpawnById(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _netID: number, _target?: number): void;
}
declare namespace Enemy {
    class FlockingBehaviour {
        private currentNeighbours;
        sightRadius: number;
        avoidRadius: number;
        private enemies;
        private pos;
        private myEnemy;
        cohesionWeight: number;
        allignWeight: number;
        avoidWeight: number;
        toTargetWeight: number;
        notToTargetWeight: number;
        obsticalAvoidWeight: number;
        private obsticalCollider;
        constructor(_enemy: Enemy, _sightRadius: number, _avoidRadius: number, _cohesionWeight: number, _allignWeight: number, _avoidWeight: number, _toTargetWeight: number, _notToTargetWeight: number, _obsticalAvoidWeight?: number);
        update(): void;
        private findNeighbours;
        private calculateCohesionMove;
        private calculateAllignmentMove;
        private calculateAvoidanceMove;
        private calculateObsticalAvoidanceMove;
        getMoveVector(): Game.ƒ.Vector2;
    }
}
declare namespace Entity {
    class Merchant extends Entity {
        constructor(_id: number, _netId?: number);
    }
}
declare namespace Calculation {
    function getCloserAvatarPosition(_startPoint: ƒ.Vector3): ƒ.Vector3;
    function calcDegree(_center: ƒ.Vector3, _target: ƒ.Vector3): number;
    function getRotatedVectorByAngle2D(_vectorToRotate: ƒ.Vector3, _angle: number): ƒ.Vector3;
    function addPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number;
    function subPercentageAmountToValue(_baseValue: number, _percentageAmount: number): number;
    function clampNumber(_number: number, _min: number, _max: number): number;
}
declare namespace InputSystem {
    function calcPositionFromDegree(_degrees: number, _distance: number): ƒ.Vector2;
    function move(): Game.ƒ.Vector3;
}
declare namespace UI {
    class Minimap extends Game.ƒ.Node {
        tag: Tag.TAG;
        private minmapInfo;
        private roomMinimapsize;
        private miniRooms;
        offsetX: number;
        offsetY: number;
        private currentRoom;
        private pointer;
        constructor(_minimapInfo: Interfaces.IMinimapInfos[]);
        createMiniRooms(): void;
        eventUpdate: (_event: Event) => void;
        private setCurrentRoom;
        update(): void;
    }
    let normalRoom: ƒ.TextureImage;
    let challengeRoom: ƒ.TextureImage;
    let merchantRoom: ƒ.TextureImage;
    let treasureRoom: ƒ.TextureImage;
    let bossRoom: ƒ.TextureImage;
}
declare namespace Networking {
    enum FUNCTION {
        CONNECTED = 0,
        SETGAMESTATE = 1,
        LOADED = 2,
        SETREADY = 3,
        SPAWN = 4,
        TRANSFORM = 5,
        CLIENTMOVEMENT = 6,
        SERVERBUFFER = 7,
        UPDATEINVENTORY = 8,
        KNOCKBACKREQUEST = 9,
        KNOCKBACKPUSH = 10,
        SPAWNBULLET = 11,
        BULLETPREDICT = 12,
        BULLETTRANSFORM = 13,
        BULLETDIE = 14,
        SENDMAGAZIN = 15,
        SPAWNENEMY = 16,
        ENEMYTRANSFORM = 17,
        ENTITYANIMATIONSTATE = 18,
        ENTITYDIE = 19,
        SPAWNINTERNALITEM = 20,
        UPDATEATTRIBUTES = 21,
        UPDATEWEAPON = 22,
        ITEMDIE = 23,
        SENDROOM = 24,
        SWITCHROOMREQUEST = 25,
        UPDATEBUFF = 26,
        UPDATEUI = 27,
        SPWANMINIMAP = 28,
        SPAWNZIPZAP = 29
    }
    import ƒClient = FudgeNet.FudgeClient;
    let client: ƒClient;
    let createdRoom: boolean;
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
    function createRoom(): void;
    function joinRoom(_roomId: string): void;
    function getRooms(): void;
    function loaded(): void;
    function spawnPlayer(): void;
    function setClient(): void;
    function updateAvatarPosition(_position: ƒ.Vector3, _rotation: ƒ.Vector3): void;
    function sendClientInput(_netId: number, _inputPayload: Interfaces.IInputAvatarPayload): void;
    function sendServerBuffer(_netId: number, _buffer: Interfaces.IStatePayload): void;
    function knockbackRequest(_netId: number, _knockbackForce: number, _position: Game.ƒ.Vector3): void;
    function knockbackPush(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    function updateInventory(_add: boolean, _itemId: Items.ITEMID, _itemNetId: number, _netId: number): void;
    function spawnMinimap(_miniMapInfos: Interfaces.IMinimapInfos[]): void;
    function spawnBullet(_bulletType: Bullets.BULLETCLASS, _direction: ƒ.Vector3, _bulletNetId: number, _ownerNetId: number): void;
    function sendMagazin(_magazin: Interfaces.IMagazin): void;
    function sendBulletInput(_netId: number, _inputPayload: Interfaces.IInputBulletPayload): void;
    function updateBullet(_position: ƒ.Vector3, _rotation: ƒ.Vector3, _netId: number): void;
    function removeBullet(_netId: number): void;
    function spawnZipZap(_ownerNetId: number, _netId: number): void;
    function spawnEnemy(_enemyClass: Enemy.ENEMYCLASS, _enemy: Enemy.Enemy, _netId: number): void;
    function updateEnemyPosition(_position: ƒ.Vector3, _netId: number): void;
    function updateEntityAnimationState(_state: Entity.ANIMATIONSTATES, _netId: number): void;
    function removeEntity(_netId: number): void;
    function spawnItem(_id: number, _position: ƒ.Vector2, _netId: number): void;
    function updateEntityAttributes(_attributePayload: Interfaces.IAttributeValuePayload, _netId: number): void;
    function updateAvatarWeapon(_weapon: Weapons.Weapon, _targetNetId: number): void;
    function removeItem(_netId: number): void;
    function updateBuffList(_buffList: Buff.Buff[], _netId: number): void;
    function updateUI(_position: Game.ƒ.Vector2, _value: number): void;
    function sendRoom(_room: Interfaces.IRoom): void;
    function switchRoomRequest(_direction: Interfaces.IRoomExits): void;
    /**
     * generates individual IDs on Host without duplicates returns the given NetId
     * @param _netId if undefined generates a new NetId -> only undefined on Host
     * @returns a new netId or the netId provided by the host
     */
    function IdManager(_netId: number): number;
    function popID(_id: number): void;
    function isNetworkObject(_object: any): _object is Interfaces.INetworkable;
    function getNetId(_object: Game.ƒ.Node): number;
}
declare namespace Player {
    abstract class Player extends Entity.Entity {
        client: Networking.ClientPrediction;
        readonly abilityCount: number;
        currentabilityCount: number;
        constructor(_id: Entity.ID, _netId?: number);
        move(_direction: ƒ.Vector3): void;
        openDoor(): void;
        protected scaleMoveVector(_direction: Game.ƒ.Vector3): void;
        predict(): void;
        collide(_direction: Game.ƒ.Vector3): void;
        getItemCollision(): void;
        abstract attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void;
        doAbility(): void;
    }
    class Melee extends Player {
        block: Ability.Block;
        readonly abilityCooldownTime: number;
        currentabilityCooldownTime: number;
        weapon: Weapons.Weapon;
        swordRadius: number;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        doAbility(): void;
    }
    class Ranged extends Player {
        weapon: Weapons.RangedWeapon;
        dash: Ability.Dash;
        performAbility: boolean;
        lastMoveDirection: Game.ƒ.Vector3;
        attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;
        move(_direction: ƒ.Vector3): void;
        doAbility(): void;
    }
}
declare namespace Generation {
    export enum ROOMTYPE {
        START = 0,
        NORMAL = 1,
        MERCHANT = 2,
        TREASURE = 3,
        CHALLENGE = 4,
        BOSS = 5
    }
    export class EnemyCountManager {
        private maxEnemyCount;
        get getMaxEnemyCount(): number;
        private currentEnemyCount;
        get getCurrentEnemyCount(): number;
        finished: boolean;
        setFinished: boolean;
        constructor(_enemyCount: number, _setFinished: boolean);
        onEnemyDeath(): void;
    }
    export let txtStartRoom: Game.ƒ.TextureImage;
    export let txtNormalRoom: Game.ƒ.TextureImage;
    export let txtBossRoom: Game.ƒ.TextureImage;
    export let txtMerchantRoom: Game.ƒ.TextureImage;
    export let txtTreasureRoom: Game.ƒ.TextureImage;
    export let txtChallengeRoom: Game.ƒ.TextureImage;
    export abstract class Room extends ƒ.Node {
        tag: Tag.TAG;
        roomType: ROOMTYPE;
        coordinates: Game.ƒ.Vector2;
        walls: Wall[];
        obsticals: Obsitcal[];
        enemyCountManager: EnemyCountManager;
        positionUpdated: boolean;
        exitDoor: Door;
        roomSize: number;
        exits: Interfaces.IRoomExits;
        mesh: ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh;
        protected avatarSpawnPointN: Game.ƒ.Vector2;
        get getSpawnPointN(): Game.ƒ.Vector2;
        protected avatarSpawnPointE: Game.ƒ.Vector2;
        get getSpawnPointE(): Game.ƒ.Vector2;
        protected avatarSpawnPointS: Game.ƒ.Vector2;
        get getSpawnPointS(): Game.ƒ.Vector2;
        protected avatarSpawnPointW: Game.ƒ.Vector2;
        get getSpawnPointW(): Game.ƒ.Vector2;
        protected cmpMaterial: ƒ.ComponentMaterial;
        constructor(_coordiantes: Game.ƒ.Vector2, _roomSize: number, _roomType: ROOMTYPE);
        protected eventUpdate: (_event: Event) => void;
        onAddToGraph(): void;
        update(): void;
        private addWalls;
        setSpawnPoints(): void;
        getRoomSize(): number;
        setRoomExit(_neighbour: Room): void;
        openDoors(): void;
    }
    export class StartRoom extends Room {
        private startRoomMat;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
    }
    export class NormalRoom extends Room {
        normalRoomMat: ƒ.Material;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
    }
    export class BossRoom extends Room {
        boss: Enemy.Enemy;
        bossRoomMat: ƒ.Material;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
        update(): void;
        done(): void;
        onAddToGraph(): void;
        private getRandomBoss;
    }
    export class TreasureRoom extends Room {
        private treasureRoomMat;
        private spawnChance;
        get getSpawnChance(): number;
        private treasureCount;
        private treasures;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
        private createTreasures;
        onAddToGraph(): void;
        onItemCollect(_item: Items.Item): void;
    }
    export class MerchantRoom extends Room {
        private merchantRoomMat;
        private merchant;
        private items;
        private itemsSpawnPoints;
        private itemCount;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
        private createShop;
        onAddToGraph(): void;
        private createSpawnPoints;
        onItemCollect(_item: Items.Item, _avatar: Player.Player): boolean;
        private shoping;
    }
    enum CHALLENGE {
        THORSHAMMER = 0
    }
    export class ChallengeRoom extends Room {
        challenge: CHALLENGE;
        item: Items.Item;
        challengeRoomMat: ƒ.Material;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number);
        protected randomChallenge(): CHALLENGE;
        update(): void;
        onAddToGraph(): void;
        spawnEnemys(): void;
        protected startThorsHammerChallenge(): void;
        protected stopThorsHammerChallenge(): void;
    }
    export let txtWallNorth: Game.ƒ.TextureImage;
    export let txtWallSouth: Game.ƒ.TextureImage;
    export let txtWallEast: Game.ƒ.TextureImage;
    export let txtWallWest: Game.ƒ.TextureImage;
    export class Wall extends ƒ.Node {
        tag: Tag.TAG;
        collider: Game.ƒ.Rectangle;
        door: Door;
        private normal;
        get getNormal(): Game.ƒ.Vector3;
        constructor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2, _room: Room);
        addDoor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2): void;
        setCollider(): void;
    }
    export let txtDoorNorth: Game.ƒ.TextureImage;
    export let txtDoorSouth: Game.ƒ.TextureImage;
    export let txtDoorEast: Game.ƒ.TextureImage;
    export let txtDoorWest: Game.ƒ.TextureImage;
    export class Door extends ƒ.Node {
        tag: Tag.TAG;
        collider: Game.ƒ.Rectangle;
        direction: Interfaces.IRoomExits;
        private doorMat;
        constructor();
        setCollider(): void;
        changeRoom(): void;
        openDoor(): void;
        closeDoor(): void;
    }
    export let txtDoorExit: Game.ƒ.TextureImage;
    export class ExitDoor extends Door {
        changeRoom(): void;
    }
    export class Obsitcal extends ƒ.Node {
        tag: Tag.TAG;
        collider: Collider.Collider;
        parentRoom: Room;
        direction: Interfaces.IRoomExits;
        constructor(_parent: Room, _position: Game.ƒ.Vector2, _scale: number);
    }
    export {};
}
declare namespace Generation {
    let generationFailed: boolean;
    let rooms: Room[];
    const compareNorth: Game.ƒ.Vector2;
    const compareEast: Game.ƒ.Vector2;
    const compareSouth: Game.ƒ.Vector2;
    const compareWest: Game.ƒ.Vector2;
    function procedualRoomGeneration(): void;
    /**
     * function to get coordiantes from all existing rooms
     * @returns Vector2 array with coordinates of all current existing rooms in RoomGeneration.rooms
     */
    function getCoordsFromRooms(): Game.ƒ.Vector2[];
    function switchRoom(_direction: Interfaces.IRoomExits): void;
    /**
     * removes erything unreliable from the graph and adds the new room to the graph , sending it to the client & spawns enemies if existing in room
     * @param _room the room it should spawn
     */
    function addRoomToGraph(_room: Room): void;
}
declare namespace Entity {
    let txtShadow: Game.ƒ.TextureImage;
    let txtShadowRound: Game.ƒ.TextureImage;
    class Shadow extends Game.ƒ.Node {
        private mesh;
        private shadowMatt;
        shadowParent: Game.ƒ.Node;
        protected cmpMaterial: ƒ.ComponentMaterial;
        constructor(_parent: Game.ƒ.Node);
        updateShadowPos(): void;
    }
    class ShadowRound extends Shadow {
        private shadowMatRound;
        constructor(_parent: Game.ƒ.Node);
        updateShadowPos(): void;
    }
}
declare namespace Weapons {
    enum AIM {
        NORMAL = 0,
        HOMING = 1
    }
    enum WEAPONTYPE {
        RANGEDWEAPON = 0,
        MELEEWEAPON = 1,
        THORSHAMMERWEAPON = 2
    }
    abstract class Weapon {
        ownerNetId: number;
        get owner(): Entity.Entity;
        protected cooldown: Ability.Cooldown;
        get getCoolDown(): Ability.Cooldown;
        protected attackCount: number;
        get getAttackCount(): number;
        currentAttackCount: number;
        aimType: AIM;
        bulletType: Bullets.BULLETTYPE;
        projectileAmount: number;
        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number, _aimType: AIM);
        abstract shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void;
        abstract getType(): WEAPONTYPE;
        protected inaccuracy(_direciton: ƒ.Vector3): void;
        protected fire(_magazine: Bullets.Bullet[]): void;
    }
    class RangedWeapon extends Weapon {
        magazin: Bullets.Bullet[];
        get getMagazin(): Bullets.Bullet[];
        set setMagazin(_magazin: Bullets.Bullet[]);
        ItemFunctions: Function[];
        shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void;
        protected sendMagazin(): void;
        protected fire(_magazine: Bullets.Bullet[]): void;
        addFunction(_func: Function): void;
        deleteFunction(_func: Function): void;
        private processItemEffects;
        protected loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.BULLETTYPE, _netId?: number): Bullets.Bullet[];
        getType(): WEAPONTYPE;
    }
    class MeleeWeapon extends Weapon {
        shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void;
        getType(): WEAPONTYPE;
    }
    class ThorsHammer extends RangedWeapon {
        weaponStorage: Weapon;
        constructor(_attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number);
        getType(): WEAPONTYPE;
        shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void;
        protected fire(_magazine: Bullets.Bullet[]): void;
    }
}
