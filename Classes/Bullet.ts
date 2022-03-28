namespace Items {
    export class Bullet extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public hitPoints: number
        public flyDirection: ƒ.Vector3;
        public speed: number;
        public lifetime: number;

        lifespan(_graph: ƒ.Node): void {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }

        constructor(_name: string, _position: ƒ.Vector3, _direction: ƒ.Vector3, _attackPoints: number, _lifetime: number, _speed: number) {
            super(_name)
            this.hitPoints = _attackPoints;
            this.lifetime = _lifetime * Game.frameRate;
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position;
            this.speed = _speed;
            this.flyDirection = _direction;
        }

        move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
        }
    }
}