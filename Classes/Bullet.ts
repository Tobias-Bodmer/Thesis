namespace Bullets {

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();

    export class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        owner: Tag.TAG = Tag.TAG.PLAYER;
        public netId: number = Networking.idGenerator();
        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];
        public tag: Tag.TAG = Tag.TAG.BULLET;
        public flyDirection: ƒ.Vector3;
        direction: ƒ.Vector3;
        public collider: Collider.Collider;

        public hitPoints: number = 5;
        public speed: number = 20;
        lifetime: number = 1 * Game.frameRate;
        knockbackForce: number = 4;

        time: number = 0;
        killcount: number = 1;

        async despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
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
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
        }


        async update() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.bulletPrediction();
            this.collisionDetection();
            this.despawn();
        }

        doKnockback(_body: ƒAid.NodeSprite): void {
            (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void {

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
            let colliders: any[] = [];
            if (this.owner == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if ((<Enemy.Enemy>element).attributes.healthPoints > 0) {
                        (<Enemy.Enemy>element).getDamage(this.hitPoints);
                        (<Enemy.Enemy>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        Game.graph.addChild(new UI.DamageUI((<Enemy.Enemy>element).cmpTransform.mtxLocal.translation, this.hitPoints));
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            })
            if (this.owner == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER);
                colliders.forEach((element) => {
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if ((<Player.Player>element).attributes.healthPoints > 0 && (<Player.Player>element).attributes.hitable) {
                            (<Player.Player>element).getDamage(this.hitPoints);
                            (<Player.Player>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            Game.graph.addChild(new UI.DamageUI((<Player.Player>element).cmpTransform.mtxLocal.translation, this.hitPoints));
                            this.lifetime = 0;
                            this.killcount--;
                        }
                    }
                })
            }

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
        rotateSpeed: number = 3;
        targetDirection: ƒ.Vector3;

        constructor(_position: ƒ.Vector2, _direction: ƒ.Vector3, _target: ƒ.Vector3, _netId?: number) {
            super(_position, _direction, _netId);
            this.speed = 20;
            this.hitPoints = 5;
            this.lifetime = 1 * Game.frameRate;
            this.killcount = 1;
            this.target = _target;
            this.targetDirection = _direction;
        }
        async update(): Promise<void> {
            this.calculateHoming();
            super.update()
        }

        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2: number = ƒ.Vector3.CROSS(newDirection, this.targetDirection).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
            this.targetDirection = Calculation.getRotatedVectorByAngle2D(this.targetDirection, -rotateAmount2 * this.rotateSpeed);
        }
    }
}