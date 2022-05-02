namespace Bullets {

    export enum BULLETTYPE {
        STANDARD,
        HIGHSPEED,
        SLOW,
        MELEE,
        SUMMONER
    }

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();
    export let waterBallTxt: ƒ.TextureImage = new ƒ.TextureImage();


    export class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.IKnockbackable, Interfaces.INetworkable {
        public tag: Tag.TAG = Tag.TAG.BULLET;
        owner: number; get _owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.owner) };
        public netId: number;
        public clientPrediction: Networking.ClientBulletPrediction;
        public serverPrediction: Networking.ServerBulletPrediction;
        public flyDirection: ƒ.Vector3;
        direction: ƒ.Vector3;

        public collider: Collider.Collider;

        public hitPointsScale: number;
        public speed: number = 20;
        lifetime: number = 1 * 60;
        knockbackForce: number = 4;
        type: BULLETTYPE;

        time: number = 0;
        killcount: number = 1;

        texturePath: string;

        public despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);

                }
            }
        }

        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _netId?: number) {
            super(BULLETTYPE[_bulletType]);

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
            }

            let ref = Game.bulletsJSON.find(bullet => bullet.name == BULLETTYPE[_bulletType].toLowerCase());

            this.speed = ref.speed;
            this.hitPointsScale = ref.hitPointsScale;
            this.lifetime = ref.lifetime;
            this.knockbackForce = ref.knockbackForce;
            this.killcount = ref.killcount;
            this.texturePath = ref.texturePath;

            // this.addComponent(new ƒ.ComponentLight(new ƒ.LightPoint(ƒ.Color.CSS("white"))));

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
            let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            let colliderPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(colliderPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.owner = _ownerId;

            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate);
        }


        public eventUpdate = (_event: Event): void => {
            this.update();
        };

        public update() {
            this.predict();
        }


        public predict() {
            if (Networking.client.idHost != Networking.client.id && this._owner == Game.avatar1) {
                this.clientPrediction.update();
            }
            else {
                if (this._owner == Game.avatar2) {
                    this.serverPrediction.update();
                } else {
                    this.move(this.flyDirection.clone);
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
            }
            if (Networking.client.idHost == Networking.client.id) {
                this.despawn();
            }
        }
        public move(_direction: Game.ƒ.Vector3) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this._owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.collisionDetection();
        }


        public doKnockback(_body: ƒAid.NodeSprite): void {
        }

        public getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void {
        }

        protected updateRotation(_direction: ƒ.Vector3) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }


        protected loadTexture() {
            if (this.texturePath != "" || this.texturePath != null) {
                let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
                let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
                let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);

                let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

                oldComCoat = this.getComponent(ƒ.ComponentMaterial);

                switch (this.texturePath) {
                    case bulletTxt.url:
                        newTxt = bulletTxt;
                        break;
                    case waterBallTxt.url:
                        newTxt = waterBallTxt;
                        break;

                    default:
                        break;
                }
                newCoat.color = ƒ.Color.CSS("WHITE");
                newCoat.texture = newTxt;
                oldComCoat.material = newMtr;
            }
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

        public collisionDetection() {
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

    export class HomingBullet extends Bullet {
        target: ƒ.Vector3;
        rotateSpeed: number = 2;
        targetDirection: ƒ.Vector3;

        constructor(_bullettype: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _target?: ƒ.Vector3, _netId?: number) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
            this.speed = 20;
            this.hitPointsScale = 1;
            this.lifetime = 1 * 60;
            this.killcount = 1;
            if (_target != null) {
                this.target = _target;
            }
            // else {
            //     this.target = ƒ.Vector3.SUM(this.mtxLocal.translation, _direction);
            // }
            this.targetDirection = _direction;
            if (Networking.client.idHost == Networking.client.id) {
                this.setTarget(Game.avatar1.netId);
            }
        }

        public update(): void {

            // this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.update);
        }
        public move(_direction: Game.ƒ.Vector3) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            } else {
                if (this._owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
            super.update();
        }

        setTarget(_netID: number) {
            if (Game.entities.find(ent => ent.netId == _netID) != undefined) {
                this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
            }
        }

        private calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2: number = ƒ.Vector3.CROSS(newDirection, this.mtxLocal.getX()).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
        }
    }
}