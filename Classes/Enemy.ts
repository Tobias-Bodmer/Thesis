namespace Enemy {

    export enum EnemyClass {
        ENEMYDUMB,
        ENEMYDASH,
        ENEMYSMASH,
        ENEMYPATROL,
        ENEMYSHOOT,
        SUMMONOR,
        SUMMONORADDS
    }

    import ƒAid = FudgeAid;

    export class Enemy extends Entity.Entity implements Interfaces.IKnockbackable {
        currentBehaviour: Entity.BEHAVIOUR;
        target: ƒ.Vector2;
        lifetime: number;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();


        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _netId);
            this.attributes = _attributes;
            this.tag = Tag.TAG.ENEMY;

            // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["idle"]);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), (this.mtxLocal.scaling.x * this.idleScale) / 2, this.netId)
        }

        public update() {
            if (Networking.client.id == Networking.client.idHost) {
                super.update();
                this.moveBehaviour();
                this.move(this.moveDirection);
                Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
            }
        }

        public doKnockback(_body: Entity.Entity): void {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction: ƒ.Vector3) {
            // this.moveDirection.add(_direction)
            this.collide(_direction);
            // this.moveDirection.subtract(_direction);
        }

        moveBehaviour() {

        }
        public moveSimple(_target: ƒ.Vector2): ƒ.Vector2 {
            this.target = _target;
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }

        moveAway(_target: ƒ.Vector2): ƒ.Vector2 {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }

        die() {
            Game.graph.removeChild(this);
        }

        collide(_direction: ƒ.Vector3) {
            let knockback = this.currentKnockback.clone;
            _direction.add(knockback);
            if (_direction.magnitude > 0) {

                super.collide(_direction);

                let avatar: Player.Player[] = (<Player.Player[]>Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER));
                let avatarColliders: Collider.Collider[] = [];
                avatar.forEach((elem) => {
                    avatarColliders.push((<Player.Player>elem).collider);
                });

                _direction.normalize();
                _direction.scale((1 / Game.frameRate * this.attributes.speed));
                if (knockback.magnitude > 0) {
                    knockback.normalize();
                    knockback.scale((1 / Game.frameRate * this.attributes.speed));
                }

                this.calculateCollider(avatarColliders, _direction)

                if (this.canMoveX && this.canMoveY) {
                    this.cmpTransform.mtxLocal.translate(_direction);
                } else if (this.canMoveX && !this.canMoveY) {
                    _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction);
                } else if (!this.canMoveX && this.canMoveY) {
                    _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
            }
            _direction.subtract(knockback);

            this.reduceKnockback();
        }
    }

    export class EnemyDumb extends Enemy {

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        update(): void {
            super.update();
        }

        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance > 2) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }

        }

        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }

    }

    export class EnemySmash extends Enemy {
        isAttacking = false;
        coolDown = 2 * Game.frameRate;
        currentCooldown = this.coolDown;
        avatars: Player.Player[] = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour: Entity.BEHAVIOUR = Entity.BEHAVIOUR.IDLE;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        public update(): void {
            super.update();
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= (<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["attack"]).frames.length - 1) {
                this.isAttacking = false;
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 2) {
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
                this.isAttacking = true;
            }
            if (this.currentBehaviour == Entity.BEHAVIOUR.IDLE) {
                if (this.currentCooldown > 0) {
                    this.currentCooldown--;
                }
                else {
                    this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW
                    this.currentCooldown = this.coolDown;
                }
            }
        }


        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.ATTACK:
                    this.switchAnimation(Entity.ANIMATIONSTATES.ATTACK);
                    this.moveDirection = ƒ.Vector3.ZERO();
            }
        }
    }

    export class EnemyDash extends Enemy {
        isAttacking = false;
        lastMoveDireciton: Game.ƒ.Vector3;
        dashCount: number = 1;
        avatars: Player.Player[] = [];
        randomPlayer = Math.round(Math.random());

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        public update(): void {
            super.update();
        }

        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2]
            this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();


            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
                this.isAttacking = false;
            }
            else if (distance < 3 && !this.isAttacking) {
                this.doDash();
            }

        }

        doDash() {
            if (!this.isAttacking) {
                this.isAttacking = true;
                this.attributes.hitable = false;
                this.attributes.speed *= 1.1;
                setTimeout(() => {
                    this.attributes.speed /= 1.1;
                    this.attributes.hitable = true;
                    this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                }, 300);
            }
        }

        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.isAttacking) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.moveSimple(this.target).toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }

    export class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[] = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime: number = 1000;
        currenPointIndex: number = 0;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        public update(): void {
            super.update();
        }

        moveBehaviour(): void {
            this.patrol();
        }

        patrol() {
            if (this.mtxLocal.translation.getDistance(ƒ.Vector3.SUM(this.patrolPoints[this.currenPointIndex].toVector3(), Game.currentRoom.mtxLocal.translation)) > 0.3) {
                this.moveDirection = this.moveSimple((ƒ.Vector2.SUM(this.patrolPoints[this.currenPointIndex], Game.currentRoom.mtxLocal.translation.toVector2()))).toVector3();
            } else {
                setTimeout(() => {
                    if (this.currenPointIndex + 1 < this.patrolPoints.length) {
                        this.currenPointIndex++;
                    }
                    else {
                        this.currenPointIndex = 0;
                    }
                }, this.waitTime);
            }
        }

    }

    export class EnemyShoot extends Enemy {
        weapon: Weapons.Weapon;
        viewRadius: number = 3;
        gotRecognized: boolean = false;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);

            this.weapon = new Weapons.Weapon(60, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.HOMING);
        }

        update() {
            super.update();
        }

        moveBehaviour(): void {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance < 5) {
                this.moveDirection = this.moveAway(this.target).toVector3();
                this.gotRecognized = true;
            } else {
                this.moveDirection = ƒ.Vector3.ZERO();
            }

            this.shoot();
        }

        public getDamage(_value: number): void {
            super.getDamage(_value);
            this.gotRecognized = true;
        }

        public shoot(_netId?: number) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);

            if (_direction.magnitude < 3 || this.gotRecognized) {
                this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, true);
            }


            // if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
            //     _direction.normalize();
            //     // let bullet: Bullets.Bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), _netId);
            //     bullet.owner = this.tag;
            //     bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            //     Game.graph.addChild(bullet);
            //     if (Networking.client.id == Networking.client.idHost) {
            //         Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
            //         this.weapon.currentAttackCount--;
            //     }

            // }
        }
    }

    export class SummonorAdds extends Enemy {
        isAttacking = false;
        lastMoveDireciton: Game.ƒ.Vector3;
        dashCount: number = 1;
        avatar: Player.Player;
        randomPlayer = Math.round(Math.random());

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _target: Player.Player, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.avatar = _target;
        }

        public update(): void {
            super.update();
        }

        behaviour() {
            this.target = this.avatar.mtxLocal.translation.toVector2();

            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
                this.isAttacking = false;
            }
            else if (distance < 3 && !this.isAttacking) {
                this.doDash();
            }

        }

        doDash() {
            if (!this.isAttacking) {
                this.isAttacking = true;
                this.attributes.hitable = false;
                this.attributes.speed *= 5;
                setTimeout(() => {
                    this.attributes.speed /= 5;
                    this.attributes.hitable = true;
                    this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                }, 300);
            }
        }

        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.isAttacking) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.moveSimple(this.target).toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }



    // export class EnemyCircle extends Enemy {
    //     distance: number = 5;

    //     constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
    //         super(_name, _properties, _position);
    //     }

    //     move(): void {
    //         super.move();
    //         this.moveCircle();
    //     }

    //     lifespan(_graph: ƒ.Node): void {
    //         super.lifespan(_graph);
    //     }

    //     async moveCircle() {
    //         this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
    //         console.log(this.target);
    //         let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
    //         // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
    //         if (distancePlayer1 > this.distance) {
    //             this.moveSimple();
    //         }
    //         else {
    //             let degree = Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, this.target)
    //             let add = 0;

    //             // while (distancePlayer1 <= this.distance) {
    //             //     let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, InputSystem.calcPositionFromDegree(degree + add, this.distance).toVector3(0));
    //             //     direction.normalize();

    //             //     direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
    //             //     this.cmpTransform.mtxLocal.translate(direction, true);
    //             //     add += 5;
    //             // }

    //         }
    //     }
    // }
}