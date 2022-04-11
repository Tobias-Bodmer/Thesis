namespace Player {
    export enum PLAYERTYPE {
        RANGED,
        MELEE
    }

    export abstract class Player extends Game.ƒAid.NodeSprite implements Interfaces.IKnockbackable {
        public tag: Tag.TAG = Tag.TAG.PLAYER;
        public items: Array<Items.Item> = [];
        public properties: Character;
        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1);

        collider: Collider.Collider;
        canMove: boolean = true;
        knockbackForce: number;

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;
        readonly abilityCooldownTime: number = 10;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        constructor(_name: string, _properties: Character) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }

        public move(_direction: ƒ.Vector3) {
            if (this.canMove) {
                let canMoveX: boolean = true;
                let canMoveY: boolean = true;

                this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();

                _direction.scale((1 / 60 * this.properties.attributes.speed));


                let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
                colliders.forEach((element) => {
                    if (this.collider.collidesRect(element.collider)) {
                        let intersection = this.collider.getIntersectionRect(element.collider);
                        let areaBeforeMove = Math.round((intersection.height * intersection.width) * 1000) / 1000;

                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                canMoveX = false;
                            }
                        }

                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }
                })

                let enemyColliders: Enemy.Enemy[] = Game.enemies;
                enemyColliders.forEach((element) => {
                    if (this.collider.collides(element.collider)) {
                        let intersection = this.collider.getIntersection(element.collider);
                        let areaBeforeMove = Math.round((intersection) * 1000) / 1000;

                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = Math.round((newIntersection) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                canMoveX = false;
                            }
                        }

                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = Math.round((newIntersection) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }
                })

                if (canMoveX && canMoveY) {
                    this.cmpTransform.mtxLocal.translate(_direction, false);
                } else if (canMoveX && !canMoveY) {
                    _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction, false);
                } else if (!canMoveX && canMoveY) {
                    _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction, false);
                }
            }
        }

        public attack(_direction: ƒ.Vector3, _netId?: number, sync?: boolean) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, _netId);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                if (sync) {
                    Networking.spawnBullet(_direction, bullet.netId);
                }

                this.weapon.currentAttackCount--;
            }
        }

        public doKnockback(_body: ƒAid.NodeSprite): void {
            //TODO: where to trigger this....
            (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            this.canMove = false;

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector2.DIFFERENCE(_position.toVector2(), this.cmpTransform.mtxLocal.translation.toVector2()).toVector3(0);

            direction.normalize();
            while (_knockbackForce > 0) {
                direction.scale(_knockbackForce);

                this.cmpTransform.mtxLocal.translate(direction, false);

                _knockbackForce -= 0.2;
            }
        }

        public doAbility() {

        }

        public cooldown() {

            let specificCoolDownTime: number = this.weapon.cooldownTime * this.properties.attributes.coolDownReduction;
            // console.log(this.properties.attributes.coolDownReduction);
            if (this.weapon.currentAttackCount <= 0) {
                if (this.weapon.currentCooldownTime <= 0) {
                    this.weapon.currentCooldownTime = specificCoolDownTime;
                    this.weapon.currentAttackCount = this.weapon.attackCount;
                } else {
                    // console.log(this.currentCooldownTime);

                    this.weapon.currentCooldownTime--;
                }
            }

            if (this.currentabilityCount <= 0) {
                if (this.currentabilityCooldownTime <= 0) {
                    this.currentabilityCooldownTime = this.abilityCooldownTime;
                    this.currentabilityCount = this.abilityCount;
                } else {
                    this.currentabilityCooldownTime--;
                }
            }
        }

        public collector() {

        }

    }

    export class Melee extends Player {

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;
        readonly abilityCooldownTime: number = 40;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        public attack(_direction: ƒ.Vector3, _netId?: number, sync?: boolean) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.MeleeBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, _netId);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                if (sync) {
                    Networking.spawnBullet(_direction, bullet.netId);
                }

                this.weapon.currentAttackCount--;
            }
        }

        public doAbility() {
            if (this.currentabilityCount > 0) {
                this.properties.attributes.speed *= 4;

                setTimeout(() => {
                    this.properties.attributes.speed /= 2;
                    setTimeout(() => {
                        this.properties.attributes.speed /= 2;
                    }, 100);
                }, 300);
                this.currentabilityCount--;
            }
        }
    }

    export class Ranged extends Player {

    }
}