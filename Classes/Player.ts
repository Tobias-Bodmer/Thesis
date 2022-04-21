namespace Player {
    export enum PLAYERTYPE {
        RANGED,
        MELEE
    }

    export abstract class Player extends Entity.Entity implements Interfaces.IKnockbackable {
        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId);

        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];
        time: number = 0;

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;
        readonly abilityCooldownTime: number = 10;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _netId?: number) {
            super(_id, _attributes, _netId);
            this.tag = Tag.TAG.PLAYER;
        }

        public move(_direction: ƒ.Vector3) {

            if (_direction.magnitude != 0) {
                _direction = Game.ƒ.Vector3.NORMALIZATION(_direction, 1)
                // this.switchAnimation("walk");
            }
            else if (_direction.magnitude == 0) {
                // this.switchAnimation("idle");
            }

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

            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }

            let enemyColliders: Enemy.Enemy[] = Game.enemies;
            enemyColliders.forEach(element => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection;

                    if (areaBeforeMove < this.collider.radius + element.collider.radius) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }

                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    } else {
                        this.canMoveX = false;
                        this.canMoveY = false;
                    }
                    //TODO: Sync knockback correctly over network
                    // if (Networking.client.id == Networking.client.idHost) {
                    //     element.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                    // } else {
                    //     Networking.knockbackRequest(element.netId, this.attributes.knockbackForce, this.mtxLocal.translation);
                    // }
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


            // if (Networking.client.id == Networking.client.idHost) {
            //     Game.avatar2.avatarPrediction();
            // }
            // if (Networking.client.id != Networking.client.idHost) {
            //     Game.avatar1.avatarPrediction();
            // } 
        }

        getItemCollision() {
            let itemCollider: Items.Item[] = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    Networking.updateInventory(item.id, item.netId, this.netId);
                    item.doYourThing(this);
                    this.items.push(item);
                }
            })
        }

        avatarPrediction() {
            this.time += Game.ƒ.Loop.timeFrameGame;

            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.avatarPrediction(this.cmpTransform.mtxLocal.translation, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }

            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (this.hostPositions[this.tick - 1].x != this.positions[this.tick - 1].x || this.hostPositions[this.tick - 1].y != this.positions[this.tick - 1].y) {
                        console.log(this.positions[this.tick - 1]);
                        console.log(this.hostPositions[this.tick - 1]);

                        console.log("correct");
                        this.correctPosition();
                    }
                }
            }
        }

        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                console.log(this.cmpTransform.mtxLocal.translation);
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
                console.log(this.cmpTransform.mtxLocal.translation);
            } else {
                setTimeout(() => { this.correctPosition }, 100);
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

        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId);


        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
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

        performAbility: boolean = false;
        lastMoveDirection: Game.ƒ.Vector3;

        public move(_direction: ƒ.Vector3) {
            if (this.performAbility) {
                super.move(this.lastMoveDirection);
            } else {
                super.move(_direction);
                this.lastMoveDirection = _direction;
            }
        }

        //Dash
        public doAbility() {
            if (this.currentabilityCount > 0) {
                this.performAbility = true;
                this.attributes.hitable = false;
                this.attributes.speed *= 2;

                setTimeout(() => {
                    this.attributes.speed /= 2;
                    setTimeout(() => {
                        this.attributes.speed /= 1;
                        this.attributes.hitable = true;
                        this.performAbility = false;
                    }, 100);
                }, 300);
                this.currentabilityCount--;
            }
        }
    }
}