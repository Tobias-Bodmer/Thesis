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
}