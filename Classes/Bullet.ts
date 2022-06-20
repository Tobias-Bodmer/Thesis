namespace Bullets {

    export enum BULLETTYPE {
        STANDARD,
        HIGHSPEED,
        SLOW,
        MELEE,
        SUMMONER,
        STONE,
        THORSHAMMER,
        ZIPZAP
    }

    export enum BULLETCLASS {
        NORMAL, FALLING, HOMING
    }

    export let bulletTxt: ƒ.TextureImage = new ƒ.TextureImage();
    export let waterBallTxt: ƒ.TextureImage = new ƒ.TextureImage();
    export let thorsHammerTxt: ƒ.TextureImage = new ƒ.TextureImage();

    export abstract class Bullet extends Game.ƒ.Node implements Interfaces.ISpawnable, Interfaces.INetworkable {
        public tag: Tag.TAG = Tag.TAG.BULLET;
        ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };
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
        hitted: Entity.Entity[] = [];
        hittedCd: Ability.Cooldown[] = [];

        texturePath: string;
        lastPosition: ƒ.Vector3;
        countCheckUpdate: number = 0;

        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerNetId: number, _netId?: number) {
            super(BULLETTYPE[_bulletType].toLowerCase());

            this.type = _bulletType;

            this.netId = Networking.IdManager(_netId);

            let ref = Game.bulletsJSON.find(bullet => bullet.name == BULLETTYPE[_bulletType].toLowerCase());

            this.speed = ref.speed;
            this.hitPointsScale = ref.hitPointsScale;
            this.lifetime = ref.lifetime;
            this.knockbackForce = ref.knockbackForce;
            this.killcount = ref.killcount;
            this.texturePath = ref.texturePath;

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
            let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            let colliderPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(colliderPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            if (_direction.magnitudeSquared > 0) {
                _direction.normalize();
            }
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.ownerNetId = _ownerNetId;

            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.lastPosition = Game.ƒ.Vector3.ZERO();
            this.mtxLocal.translateZ(0.1);
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate);
        }

        public eventUpdate = (_event: Event): void => {
            this.update();
        };

        protected update() {
            this.predict();
            if (Networking.client.idHost == Networking.client.id) {
                this.updateLifetime();
            }
        }

        public spawn() {
            Game.graph.addChild(this);
        }

        public despawn() {
            Networking.popID(this.netId);
            Networking.removeBullet(this.netId);
            Game.graph.removeChild(this);

            console.log("despawn");

            if (this.type == BULLETTYPE.THORSHAMMER) {
                this.spawnThorsHammer();
            }
        }

        protected updateLifetime() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime <= 0) {
                    this.despawn();
                }
            }
        }

        public predict() {
            if (Networking.client.idHost != Networking.client.id) {
                if (this.owner == Game.avatar1) {
                    this.clientPrediction.update();
                }
                this.checkUpdate();
            }
            else {
                if (this.owner == Game.avatar2) {
                    this.serverPrediction.update();
                } else {
                    this.move(this.flyDirection.clone);
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
            }
        }

        protected checkUpdate() {
            if (this.mtxLocal.translation.equals(this.lastPosition, 0)) {
                this.countCheckUpdate++;
                if (this.countCheckUpdate >= (2 * 60)) {
                    this.despawn();
                }
            } else {
                this.countCheckUpdate = 0;
            }
            this.lastPosition = this.mtxLocal.translation.clone;
        }

        public move(_direction: Game.ƒ.Vector3) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.offsetCollider();
            this.collisionDetection();
        }

        protected updateRotation(_direction: ƒ.Vector3) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }

        protected spawnThorsHammer() {
            if (Networking.client.id == Networking.client.idHost) {
                let item = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                item.setPosition(this.mtxLocal.translation.toVector2());
                if (this.owner == Game.avatar1) {
                    item.setChoosenOneNetId(Game.avatar2.netId);
                } else {
                    item.setChoosenOneNetId(Game.avatar1.netId);
                }
                item.spawn();
            }
        }

        protected loadTexture() {
            if (this.texturePath != "" && this.texturePath != null) {
                let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
                let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
                let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);

                let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

                oldComCoat = this.getComponent(ƒ.ComponentMaterial);

                switch (this.texturePath) {
                    case bulletTxt.url:
                        newTxt = bulletTxt;
                        break;
                    case waterBallTxt.url:
                        newTxt = waterBallTxt;
                        break;
                    case thorsHammerTxt.url:
                        newTxt = thorsHammerTxt;
                        break;

                    default:
                        break;
                }
                newCoat.color = ƒ.Color.CSS("WHITE");
                newCoat.texture = newTxt;
                oldComCoat.material = newMtr;
            }
        }

        setBuffToTarget(_target: Entity.Entity) {
            this.owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                })
            })
        }

        protected offsetCollider() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
        }

        private addHitted(_elem: Entity.Entity) {
            this.hitted.push(<Entity.Entity>_elem);
            this.hittedCd.push(new Ability.Cooldown(60));
            this.hittedCd[this.hittedCd.length - 1].startCooldown();
            this.hittedCd[this.hittedCd.length - 1].onEndCooldown = this.resetHitted;
        }

        private resetHitted = (): void => {
            this.hitted.splice(0, 1);
        }

        public collisionDetection() {
            let colliders: ƒ.Node[] = [];
            if (this.owner == undefined) {
                this.despawn();
                return;
            }

            if (this.owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY);
                colliders.forEach((_elem) => {

                    if (this.hitted.find(element => element == _elem)) {
                        return;
                    }

                    let element: Enemy.Enemy = (<Enemy.Enemy>_elem);
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if ((<Enemy.Enemy>element).attributes.healthPoints > 0) {
                            this.addHitted(<Entity.Entity>_elem);
                            if (element instanceof Enemy.SummonorAdds) {
                                if ((<Enemy.SummonorAdds>element).avatar == this.owner) {
                                    this.killcount--;
                                    return;
                                }
                            }
                            (<Enemy.Enemy>element).getDamage(this.owner.attributes.attackPoints * this.hitPointsScale);
                            this.setBuffToTarget((<Enemy.Enemy>element));
                            (<Enemy.Enemy>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            this.killcount--;
                        }
                    }
                })
            }
            if (this.owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {

                    if (this.hitted.find(element => element == _elem)) {
                        return;
                    }

                    let element: Player.Player = (<Player.Player>_elem);
                    if (this.collider.collides(element.collider) && element.attributes != undefined) {
                        if ((<Player.Player>element).attributes.healthPoints > 0 && (<Player.Player>element).attributes.hitable) {
                            this.addHitted(<Entity.Entity>_elem);
                            (<Player.Player>element).getDamage(this.hitPointsScale);
                            (<Player.Player>element).getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            this.killcount--;
                        }
                    }
                })
            }

            if (this.killcount <= 0) {
                this.despawn();
            }

            colliders = [];
            colliders = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
            colliders.forEach((_elem) => {
                let element: Generation.Wall = (<Generation.Wall>_elem);
                if (element.collider != undefined && this.collider.collidesRect(element.collider)) {
                    this.despawn();
                }
            })
        }
    }

    export class NormalBullet extends Bullet {
        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerNetId: number, _netId?: number) {
            super(_bulletType, _position, _direction, _ownerNetId, _netId);
        }
    }

    export class FallingBullet extends Bullet {
        private shadow: Entity.Shadow;
        constructor(_bulletType: BULLETTYPE, _position: ƒ.Vector2, _ownerNetId: number, _netId?: number) {
            super(_bulletType, _position, Game.ƒ.Vector3.ZERO(), _ownerNetId, _netId);

            this.flyDirection = ƒ.Vector3.Z();
            this.flyDirection.scale(-1);
            this.shadow = new Entity.ShadowRound(this);
            this.shadow.mtxLocal.scaling = this.mtxLocal.scaling;
            this.mtxLocal.translateZ(this.generateZIndex());
        }

        protected update(): void {
            super.update();
            this.shadow.updateShadowPos();
        }

        public move(_direction: ƒ.Vector3): void {

            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            if (this.mtxLocal.translation.z <= 1) {
                this.collisionDetection();
                if (Networking.client.id == Networking.client.idHost) {
                    if (this.mtxLocal.translation.z < 0) {
                        this.despawn();
                    }
                }
            }
        }

        protected generateZIndex(): number {
            return Math.random() * 25 + 25;
        }
    }

    export class HomingBullet extends Bullet {
        public target: ƒ.Vector3;
        private rotateSpeed: number = 5;

        constructor(_bullettype: BULLETTYPE, _position: ƒ.Vector2, _direction: ƒ.Vector3, _ownerId: number, _target: ƒ.Vector3, _netId?: number) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
            if (_target != null) {
                this.target = _target;
            } else {
                this.getTarget();
            }
        }

        private getTarget() {
            if (this.owner instanceof Enemy.Enemy) {
                this.target = (<Enemy.Enemy>this.owner).target.toVector3();
            }
        }

        public move(_direction: Game.ƒ.Vector3) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            } else {
                if (this.owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
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

    export class ZipZapObject extends Bullet {
        private nextTarget: Game.ƒ.Vector2;
        private avatars: Player.Player[];
        private playerSize: number;
        private counter: number;
        private tickHit: Ability.Cooldown;
        constructor(_ownerNetId: number, _netId: number) {
            super(BULLETTYPE.ZIPZAP, new ƒ.Vector2(0, 0), new ƒ.Vector2(0, 0).toVector3(), _ownerNetId, _netId);
            this.avatars = undefined;
            this.counter = 0;
            this.tag = Tag.TAG.UI;
            this.tickHit = new Ability.Cooldown(12);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        public eventUpdate = (_event: Event): void => {
            this.update();
        };
        protected update() {
            if (Networking.client.idHost == Networking.client.id) {
                if (Game.avatar1 != undefined && Game.avatar2 != undefined) {
                    if (this.avatars == undefined) {
                        this.avatars = [Game.avatar1, Game.avatar2];
                        this.playerSize = this.avatars.length;
                        this.nextTarget = this.avatars[0 % this.playerSize].mtxLocal.translation.toVector2();
                        this.mtxLocal.translation = this.nextTarget.toVector3();
                    }
                    this.avatars = [Game.avatar1, Game.avatar2];
                    this.move();
                    this.collider.position = this.mtxLocal.translation.toVector2();
                    if (!this.tickHit.hasCooldown) {
                        this.collisionDetection();
                        this.tickHit.startCooldown();
                    }
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                    this.killcount = 50;
                }
            }
        }

        public spawn() {
            Game.graph.addChild(this);
            Networking.spawnZipZap(this.ownerNetId, this.netId);
        }

        public despawn() {
            Game.graph.removeChild(this);
            Networking.removeBullet(this.netId);
        }

        public move() {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.nextTarget, this.mtxLocal.translation.toVector2());
            let distance = direction.magnitudeSquared;
            if (direction.magnitudeSquared > 0) {
                direction.normalize();
            }
            direction.scale(Game.deltaTime * this.speed);
            this.mtxLocal.translate(direction.toVector3());
            if (distance < 1) {
                this.counter = (this.counter + 1) % this.playerSize;
            }
            this.nextTarget = this.avatars[this.counter].mtxLocal.translation.toVector2();
        }
    }
}