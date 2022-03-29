namespace Items {
    export class Bullet extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public hitPoints: number
        public flyDirection: ƒ.Vector3;
        public speed: number;
        public lifetime: number;
        public collider: Game.ƒ.Rectangle;

        async lifespan(_graph: ƒ.Node) {
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

            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }

        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = new Game.ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y);
            this.collisionDetection();
        }

        async collisionDetection() {
            let colliders: any[] = Game.graph.getChildren().filter(element => (<any>element).collider != undefined);

            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined) {
                    (<Enemy.Enemy>element).properties.attributes.healthPoints -= this.hitPoints;
                    this.lifetime = 0;
                }
            })
        }
    }
}