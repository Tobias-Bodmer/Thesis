namespace Spawn {
    export class Bullet extends Game.ƒAid.NodeSprite implements ISpawnable {
        public attackPoints: number
        public position: ƒ.Vector3;
        public lifetime: number;

        lifespan(): boolean {
            if (this.lifetime > 0) {
                return false;
            }
            return true;
        }
    }
}