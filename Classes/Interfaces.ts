namespace Interfaces {
    export interface ISpawnable {
        lifetime?: number;
        despawn(): void;
    }

    export interface IKnockbackable {
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }

    export interface IKillable {
        onDeath(): void;
    }

    export interface IDamageable {
        getDamage(): void;
    }
    export interface IAttributeValuePayload {
        value: Entity.Attributes;
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
        rotation: Game.ƒ.Vector3;
    }

    export interface IInputAvatarPayload {
        tick: number;
        inputVector: Game.ƒ.Vector3;
        doesAbility: boolean;
    }

    export interface IStatePayload {
        tick: number;
        position: Game.ƒ.Vector3;
        rotation: Game.ƒ.Vector3;
    }

    export interface IMagazin {
        bulletTypes: Bullets.BULLETTYPE[];
        directions: Game.ƒ.Vector2[];
        ownerNetId: number;
        netIds: number[];
        targets?: ƒ.Vector3[];
    }

    export interface IRoomExits {
        north: boolean;
        east: boolean;
        south: boolean;
        west: boolean;
    }

    export interface IRoom {
        coordinates: Game.ƒ.Vector2;
        roomSize: number;
        exits: IRoomExits;
        roomType: Generation.ROOMTYPE;
        translation: Game.ƒ.Vector3;
    }

    export interface IMinimapInfos {
        coords: Game.ƒ.Vector2;
        roomType: Generation.ROOMTYPE;
    }
}