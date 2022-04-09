namespace Bullets {

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();

    export class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable {

        public netId: number = Networking.idGenerator();
        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];
        public tag: Tag.Tag = Tag.Tag.BULLET;
        public flyDirection: ƒ.Vector3;
        public collider: Collider.Collider;

        public hitPoints: number = 5;
        public speed: number = 20;
        lifetime: number = 1 * Game.frameRate;

        killcount: number = 1;

        async lifespan(_graph: ƒ.Node) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                    Networking.removeBullet(this.netId);
                }
            }
        }

        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super("normalBullet");

            if (_netId != null) {
                this.netId = _netId;
            }

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.flyDirection = _direction;

            let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
            let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            this.loadTexture();
            this.mtxLocal.rotateZ(InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
            this.cmpTransform.mtxLocal.scaleY(0.25);
            this.flyDirection = ƒ.Vector3.X();
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }


        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collisionDetection();


            if (this.tick >= 2 && this.hostPositions[this.tick - 2] != undefined && this.positions[this.tick - 2] != undefined) {
                if (this.hostPositions[this.tick - 2].x != this.positions[this.tick - 2].x) {
                    this.correctPosition();
                }
            }

            this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));

            if (Game.connected) {
                Networking.updateBullet(this.cmpTransform.mtxLocal.translation, this.netId, this.tick);
            }

            this.tick++;
        }

        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
            } else {
                setTimeout(() => { this.correctPosition }, 100);
            }
        }

        loadTexture() {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

            oldComCoat = this.getComponent(ƒ.ComponentMaterial);

            newTxt = bulletTxt;
            newCoat.color = ƒ.Color.CSS("WHITE");
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }

        async collisionDetection() {
            let colliders: any[] = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.Tag.ENEMY);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    (<Enemy.Enemy>element).properties.attributes.healthPoints -= this.hitPoints;
                    Game.graph.addChild(new UI.DamageUI((<Enemy.Enemy>element).cmpTransform.mtxLocal.translation, this.hitPoints));
                    this.lifetime = 0;
                    this.killcount--;
                }
            })

            colliders = [];
            colliders = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.Tag.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            })
        }
    }

    export class SlowBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super(_position, _direction, _netId);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 5 * Game.frameRate;
        }
    }

    export class MeleeBullet extends Bullet {
        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super(_position, _direction, _netId);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }

        async loadTexture() {

        }
    }
}