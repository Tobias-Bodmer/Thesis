namespace Interfaces {
    export interface ISpawnable {
        lifetime?: number;
        lifespan(_a: ƒ.Node): void;
    }

    export interface IKnockbackable {
        canMove: boolean;
        knockbackForce: number;
        doKnockback(_body: ƒAid.NodeSprite): void;
        getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void;
    }
}

namespace Player {
    export interface IKillable {
        onDeath(): void;
    }

    export interface IDamageable {
        getDamage(): void;
    }

}


