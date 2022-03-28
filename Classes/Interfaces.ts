namespace Interfaces {
    export interface ISpawnable {
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
