namespace Player {
    export enum PLAYERTYPE {
        RANGED,
        MELEE
    }

    export abstract class Player extends Entity.Entity implements Interfaces.IKnockbackable {
        public items: Array<Items.Item> = [];
        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Weapons.BULLETS.HOMING, 2);

        knockbackForce: number = 6;

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;
        readonly abilityCooldownTime: number = 10;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes) {
            super(_id, _attributes);
            this.tag = Tag.TAG.PLAYER;
            this.cmpTransform.mtxLocal.translateZ(0.1);
        }

        public move(_direction: ƒ.Vector3) {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();

            _direction.scale((1 / 60 * this.attributes.speed));

            this.moveDirection.add(_direction);

            this.collide(this.moveDirection);

            let doors: Generation.Door[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).doors;
            doors.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    (<Generation.Door>element).changeRoom();
                }
            });

            this.moveDirection.subtract(_direction);
        }

        collide(_direction: Game.ƒ.Vector3): void {
            super.collide(_direction);

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
                            this.canMoveX = false;
                        }
                    }

                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, _direction.y);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = Math.round((newIntersection) * 1000) / 1000;

                        if (areaBeforeMove < areaAfterMove) {
                            this.canMoveY = false;
                        }
                    }
                    this.collider.position = oldPosition;
                    //TODO: Sync knockback correctly over network
                    if (Networking.client.id == Networking.client.idHost) {
                        element.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                    } else {
                        Networking.knockbackRequest(element.netId, this.attributes.knockbackForce, this.mtxLocal.translation);
                    }
                }
            })

            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
        }

        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }

        public doKnockback(_body: Entity.Entity): void {
            // (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }

        public doAbility() {

        }

        public cooldown() {
            this.weapon.cooldown(this.attributes.coolDownReduction);

            if (this.currentabilityCount <= 0) {
                if (this.currentabilityCooldownTime <= 0) {
                    this.currentabilityCooldownTime = this.abilityCooldownTime;
                    this.currentabilityCount = this.abilityCount;
                } else {
                    this.currentabilityCooldownTime--;
                }
            }
        }

    }

    export class Melee extends Player {

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;
        readonly abilityCooldownTime: number = 40;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.MeleeBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, _netId);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                if (_sync) {
                    Networking.spawnBullet(_direction, bullet.netId);
                }

                this.weapon.currentAttackCount--;
            }
        }

        //Block
        public doAbility() {
            if (this.currentabilityCount > 0) {
                this.attributes.hitable = false;

                setTimeout(() => {
                    this.attributes.hitable = true;
                }, 600);

                this.currentabilityCount--;
            }
        }
    }

    export class Ranged extends Player {

        //Dash
        public doAbility() {
            if (this.currentabilityCount > 0) {
                this.attributes.hitable = false;
                this.attributes.speed *= 2;

                setTimeout(() => {
                    this.attributes.speed /= 2;
                    setTimeout(() => {
                        this.attributes.speed /= 1;
                        this.attributes.hitable = true;
                    }, 100);
                }, 300);
                this.currentabilityCount--;
            }
        }
    }
}