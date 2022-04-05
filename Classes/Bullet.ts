namespace Items {
    export class Bullet extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {

        public tag: Tag.Tag = Tag.Tag.BULLET;
        public flyDirection: ƒ.Vector3;
        public collider: Game.ƒ.Rectangle;

        public hitPoints: number = 5;
        public speed: number = 20;
        lifetime: number = 1 * Game.frameRate;

        private killcount: number = 1;

        async lifespan(_graph: ƒ.Node) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }

        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3) {
            super("normalBullet");
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.flyDirection = _direction;
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }


        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = new Game.ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));
            this.collisionDetection();
        }

        async collisionDetection() {
            let colliders: any[] = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.Tag.ENEMY);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    (<Enemy.Enemy>element).properties.attributes.healthPoints -= this.hitPoints;
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                    this.killcount--;
                }
            })

            colliders = [];
            colliders = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.Tag.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    this.lifetime = 0;
                }
            })
        }
    }

    export class slowBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3) {
            super(_position, _direction);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 5 * Game.frameRate;
        }
    }
}