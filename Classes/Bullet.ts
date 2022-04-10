namespace Bullets {

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();

    export class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable {

        public netId: number = Networking.idGenerator();
        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];
        public tag: Tag.TAG = Tag.TAG.BULLET;
        public flyDirection: ƒ.Vector3;
        public collider: Collider.Collider;

        public hitPoints: number = 5;
        public speed: number = 20;
        lifetime: number = 1 * Game.frameRate;

        time: number = 0;
        killcount: number = 1;

        async lifespan(_graph: ƒ.Node) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);

                    // console.log(this.hostPositions);
                    // console.log(this.positions);
                }
            }
        }

        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super("normalBullet");

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }

            // this.addComponent(new ƒ.ComponentLight(new ƒ.LightPoint(ƒ.Color.CSS("white"))));

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.flyDirection = _direction;

            let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
            let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(newPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5);
            this.updateRotation(_direction);
            this.loadTexture();
            // console.log(cmpMesh.mtxPivot.rotation);
            this.flyDirection = ƒ.Vector3.X();
        }


        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.bulletPrediction();
            this.collisionDetection();
        }

        updateRotation(_direction: ƒ.Vector3) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }

        bulletPrediction() {
            this.time += Game.ƒ.Loop.timeFrameGame;

            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.updateBullet(this.cmpTransform.mtxLocal.translation, this.netId, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }

            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (this.hostPositions[this.tick - 1].x != this.positions[this.tick - 1].x || this.hostPositions[this.tick - 1].y != this.positions[this.tick - 1].y) {
                        this.correctPosition();
                    }
                }
            }
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
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
            let colliders: any[] = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    (<Enemy.Enemy>element).properties.attributes.healthPoints -= this.hitPoints;
                    Game.graph.addChild(new UI.DamageUI((<Enemy.Enemy>element).cmpTransform.mtxLocal.translation, this.hitPoints));
                    this.lifetime = 0;
                    this.killcount--;
                }
            })

            colliders = [];
            colliders = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
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

    export class HomingBullet extends Bullet {
        target: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);
        rotateSpeed: number = 5;
        // targetVector: ƒ.Vector3 = Calculation.getVectorToAvatar(this.start);

        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super(_position, _direction, _netId);
            this.speed = 5;
            this.hitPoints = 10;
            this.lifetime = 5 * Game.frameRate;
            this.killcount = 4;
            // if (Game.enemies.length > 0) {
            //     this.start = Game.enemies[0].cmpTransform.mtxLocal.translation;
            // }
        }
        async move(): Promise<void> {
            this.calculateHoming();
            super.move()
        }

        calculateHoming() {

            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            let normalized: ƒ.Vector3;
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
                normalized = ƒ.Vector3.NORMALIZATION(newDirection);
            }
            // let targetDirection: ƒ.Vector3 = ƒ.Vector3.NORMALIZATION(this.flyDirection);
            // let rotateAmount: number = (ƒ.Vector3.CROSS(newDirection, ƒ.Vector3.Y()).z * 180) / Math.PI;
            let rotateAmount2: number = ƒ.Vector3.CROSS(newDirection, ƒ.Vector3.X()).z;
            // console.log(rotateAmount * -1);
            // this.flyDirection = new ƒ.Vector3(this.flyDirection.x, this.flyDirection.y, ƒ.Vector3.SUM(this.flyDirection, rotateVector).z)
            // console.log(this.flyDirection);
            // this.flyDirection = Calculation.getRotatedVectorByAngle2D(this.flyDirection, 5);
            this.mtxLocal.rotateZ(rotateAmount2 * this.rotateSpeed);
            // console.log(rotateAmount2);


            // this.flyDirection = ƒ.Vector3.X();
        }
    }
}