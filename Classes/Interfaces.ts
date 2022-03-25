namespace Spawn {
    export interface ISpawnable {
        position: ƒ.Vector3;
        lifetime: number;

        lifespan(_a: ƒ.Node): void;
    }
}

namespace Player {
    export interface IKillable {
        onDeath(): void;
    }

    export interface IDamagble {
        getDamage(): void;
    }
}
