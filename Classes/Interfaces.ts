namespace Interfaces {
    export interface ISpawnable {
        lifetime?: number;
        despawn(): void;
    }

    export interface IKnockbackable {
        doKnockback(_body: Entity.Entity): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }

    export interface IKillable {
        onDeath(): void;
    }

    export interface IDamageable {
        getDamage(): void;
    }
    export interface INetworkable {
        netId: number;
    }

    export interface INetworkObjects {
        netId: number;
        netObjectNode: Game.ƒ.Node;
    }

    export interface IInputBulletPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
    }


    export interface IInputAvatarPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
        doesAbility: boolean;
    }

    export interface IStatePayload {
        tick: number;
        position: Game.ƒ.Vector3;
    }

    // export interface BulletInformation {
    //     speed: number;
    //     hitPoint: number;
    //     lifeTime: number;
    //     knockbackForce: number;
    //     passthroughEnemy: number;
    //     position: Game.ƒ.Vector2;
    //     direction: Game.ƒ.Vector2;
    //     rotationDeg: number;
    //     homingTarget?: Game.ƒ.Vector2;
    // }

    export interface IRoomExits {
        north: boolean;
        east: boolean;
        south: boolean;
        west: boolean;
    }

    export interface IRoom {
        coordinates: Game.ƒ.Vector2;
        exits: IRoomExits;
        roomType: Generation.ROOMTYPE;
        direction: IRoomExits;
        translation: Game.ƒ.Vector3;
    }

    export interface IMinimapInfos {
        coords: Game.ƒ.Vector2;
        roomType: Generation.ROOMTYPE;
    }
}