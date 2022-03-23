namespace Spawn {
    export interface ISpawnable {
        position: ƒ.Vector3;
        lifetime: number;

        lifespan(): boolean;
    }
}

namespace Player {
    export interface IKillable {

    }
}
