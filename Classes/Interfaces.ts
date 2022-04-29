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
    export interface NetworkObjects {
        netId: number;
        netObjectNode: Game.ƒ.Node;
    }

    export interface InputBulletPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
    }


    export interface InputAvatarPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
        doesAbility: boolean;
    }

    export interface StatePayload {
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
    export interface RoomExits {
        north: boolean;
        east: boolean;
        south: boolean;
        west: boolean;
    }

    export interface Room {
        coordinates: Game.ƒ.Vector3;
        exits: RoomExits;
        roomType: Generation.ROOMTYPE;
        direction: RoomExits;

    }
}