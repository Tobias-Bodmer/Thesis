namespace Bullets {

    export enum BULLETTYPE {
        STANDARD,
        HIGHSPEED,
        SLOW,
        MELEE
    }

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();

    export class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        public tag: Tag.TAG = Tag.TAG.BULLET;
        owner: number; get _owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.owner) };
        public netId: number;

        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];

        public flyDirection: ƒ.Vector3;
        direction: ƒ.Vector3;

        public collider: Collider.Collider;

        public hitPointsScale: number;
        public speed: number = 20;
        lifetime: number = 1 * Game.frameRate;
        knockbackForce: number = 4;
        type: BULLETTYPE;

        time: number = 0;
        killcount: number = 1;

        async despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
                }
            }
        }

        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _netId?: number) {
            super(_name);

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
            }

            this.speed = _speed;
            this.hitPointsScale = _hitPoints;
            this.lifetime = _lifetime;
            this.knockbackForce = _knockbackForce;
            this.killcount = _killcount;

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
            this.collider = new Collider.Collider(newPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.owner = _ownerId;
        }


        async update() {
            if (Networking.client.id == Networking.client.idHost) {
                this.cmpTransform.mtxLocal.translate(this.flyDirection);
                if (this._owner == Game.avatar2) {
                    this.bulletPrediction();
                } else {
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
                this.collisionDetection();
                this.despawn();
            } else {
                if (this._owner == Game.avatar1) {
                    this.cmpTransform.mtxLocal.translate(this.flyDirection);
                    this.bulletPrediction();
                }
            }
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
                    Networking.predictionBullet(this.cmpTransform.mtxLocal.translation, this.netId, this.tick);
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

        setBuff(_target: Entity.Entity) {
            this._owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                })
            })
        }

        async collisionDetection() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
            let colliders: ƒ.Node[] = [];
            if (this._owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((_elem) => {
                let element: Enemy.Enemy = (<Enemy.Enemy>_elem);
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if ((<Enemy.Enemy>element).attributes.healthPoints > 0) {
                        if (element instanceof Enemy.SummonorAdds) {
                            if ((<Enemy.SummonorAdds>element).avatar == this._owner) {
                                this.lifetime = 0;
                                this.killcount--;
                                return;
                            }
                        }
                        (<Enemy.Enemy>element).getDamage(this._owner.attributes.attackPoints * this.hitPointsScale);
                        this.setBuff((<Enemy.Enemy>element));
                        (<Enemy.Enemy>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            })
            if (this._owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {
                    let element: Player.Player = (<Player.Player>_elem);
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if ((<Player.Player>element).attributes.healthPoints > 0 && (<Player.Player>element).attributes.hitable) {
                            (<Player.Player>element).getDamage(this.hitPointsScale);
                            (<Player.Player>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            Game.graph.addChild(new UI.DamageUI((<Player.Player>element).cmpTransform.mtxLocal.translation, this.hitPointsScale));
                            this.lifetime = 0;
                            this.killcount--;
                        }
                    }
                })
            }

            colliders = [];
            colliders = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
            colliders.forEach((_elem) => {
                let element: Generation.Wall = (<Generation.Wall>_elem);
                if (this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            })
        }
    }

    export class MeleeBullet extends Bullet {
        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _netId?: number) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId);
            this.speed = 6;
            this.hitPointsScale = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }

        async loadTexture() {

        }
    }

    export class HomingBullet extends Bullet {
        target: ƒ.Vector3;
        rotateSpeed: number = 2;
        targetDirection: ƒ.Vector3;

        constructor(_name: string, _speed: number, _hitPoints: number, _lifetime: number, _knockbackForce: number, _killcount: number, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _target?: ƒ.Vector3, _netId?: number) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _ownerId, _netId);
            this.speed = 20;
            this.hitPointsScale = 1;
            this.lifetime = 1 * Game.frameRate;
            this.killcount = 1;
            if (_target != null) {
                this.target = _target;
            }
            // else {
            //     this.target = ƒ.Vector3.SUM(this.mtxLocal.translation, _direction);
            // }
            this.targetDirection = _direction;
            if (Networking.client.idHost == Networking.client.id) {
                this.setTarget(Game.avatar2.netId);
            }
        }
        async update(): Promise<void> {
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            } else {
                if (this._owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
            super.update()
        }

        setTarget(_netID: number) {
            this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
        }

        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2: number = ƒ.Vector3.CROSS(newDirection, this.mtxLocal.getX()).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
        }
    }
}